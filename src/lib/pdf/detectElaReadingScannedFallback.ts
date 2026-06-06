import type { DetectedProblemRegion } from "./detectProblems";
import type { DetectedElaPassage, ElaDetectionResult } from "./detectElaReading";
import { parseAnswerKey } from "./parseAnswerKey";
import { classifyElaPages, type ElaPageClassification } from "./elaPageClassification";
import { hasVisionExplanationProvider } from "@/lib/ai/visionExplanation";

export type ElaScannedFallbackResult = ElaDetectionResult & {
  usedVision: boolean;
  fallbackReason: string;
};

function sliceContentAndAnswerPages(
  pages: { pageNumber: number; text: string }[],
  answerKeyPageCount: number,
) {
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const maxPage = sorted[sorted.length - 1]?.pageNumber ?? 0;
  const trailing = Math.max(1, Math.min(answerKeyPageCount, maxPage));
  const firstAnswerPage = maxPage - trailing + 1;
  return {
    contentPages: sorted.filter((p) => p.pageNumber < firstAnswerPage),
    answerPages: sorted.filter((p) => p.pageNumber >= firstAnswerPage),
    answerKeySection: sorted
      .filter((p) => p.pageNumber >= firstAnswerPage)
      .map((p) => p.text)
      .join("\n\n"),
  };
}

function buildPassagesAndRegions(
  classifications: ElaPageClassification[],
  pagesByNumber: Map<number, string>,
  answerKeyNumbers: number[],
): { passages: DetectedElaPassage[]; regions: DetectedProblemRegion[] } {
  const passages: DetectedElaPassage[] = [];
  const regions: DetectedProblemRegion[] = [];
  const assigned = new Set<number>();
  let keyQueue = [...answerKeyNumbers].sort((a, b) => a - b);

  let passageNumber = 0;
  let currentPassagePages: number[] = [];
  let currentTitle: string | null = null;
  let currentPrompt: string | null = null;
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  function flushPassage() {
    if (currentPassagePages.length === 0) return;
    passageNumber++;
    const pageNums = [...currentPassagePages];
    const bodyParts = pageNums
      .map((n) => pagesByNumber.get(n)?.trim())
      .filter((t): t is string => Boolean(t && t.length > 0));
    passages.push({
      passageNumber,
      title: currentTitle,
      promptText: currentPrompt,
      bodyText: bodyParts.join("\n\n").slice(0, 12000),
      pageStart: pageNums[0]!,
      pageEnd: pageNums[pageNums.length - 1]!,
      pageNumbers: pageNums,
      questionRangeStart: rangeStart,
      questionRangeEnd: rangeEnd,
    });
    currentPassagePages = [];
    currentTitle = null;
    currentPrompt = null;
    rangeStart = null;
    rangeEnd = null;
  }

  function nextKeyNumber(): number {
    while (keyQueue.length > 0 && assigned.has(keyQueue[0]!)) {
      keyQueue = keyQueue.slice(1);
    }
    const n = keyQueue[0] ?? regions.length + 1;
    keyQueue = keyQueue.slice(1);
    return n;
  }

  function emitQuestion(
    pageNumber: number,
    questionNums: number[],
    type: "multiple_choice" | "open_response",
    source: ElaPageClassification["source"],
  ) {
    flushPassage();
    const nums =
      questionNums.length > 0
        ? questionNums
        : [nextKeyNumber()];

    for (const num of nums) {
      if (assigned.has(num)) continue;
      assigned.add(num);
      regions.push({
        problemNumber: num,
        pageNumber,
        rawText: "",
        cleanedText: "",
        questionType: type,
        requiresImage: true,
        parseWarnings: [
          source === "vision"
            ? "ELA scanned-PDF fallback (vision page classification)"
            : "ELA scanned-PDF fallback (heuristic page classification)",
        ],
        confidence: source === "vision" ? 0.58 : 0.48,
        passageNumber: passages.length > 0 ? passages[passages.length - 1]!.passageNumber : undefined,
      } as DetectedProblemRegion & { passageNumber?: number });
    }
  }

  for (const c of classifications) {
    if (c.type === "other" || c.type === "answer_key") continue;

    if (c.type === "passage_start") {
      flushPassage();
      currentTitle = c.title;
      currentPrompt = pagesByNumber.get(c.pageNumber)?.trim().slice(0, 500) || null;
      rangeStart = c.questionRangeStart;
      rangeEnd = c.questionRangeEnd;
      currentPassagePages.push(c.pageNumber);
      continue;
    }

    if (c.type === "passage_continue") {
      currentPassagePages.push(c.pageNumber);
      continue;
    }

    if (c.type === "question_mcq") {
      emitQuestion(c.pageNumber, c.questionNumbers, "multiple_choice", c.source);
      continue;
    }

    if (c.type === "question_open") {
      emitQuestion(c.pageNumber, c.questionNumbers, "open_response", c.source);
    }
  }

  flushPassage();

  if (passages.length === 1) {
    for (const r of regions) {
      (r as { passageNumber?: number }).passageNumber = 1;
    }
  }

  // Attach each question to the passage whose pages precede it.
  if (passages.length > 1) {
    for (const r of regions) {
      if ((r as { passageNumber?: number }).passageNumber != null) continue;
      const page = r.pageNumber;
      let best: DetectedElaPassage | null = null;
      for (const p of passages) {
        if (page >= p.pageStart && page <= p.pageEnd) {
          best = p;
          break;
        }
        if (page > p.pageEnd && (!best || p.pageEnd > best.pageEnd)) {
          best = p;
        }
      }
      if (best) {
        (r as { passageNumber?: number }).passageNumber = best.passageNumber;
      }
    }
  }

  return { passages, regions };
}

/**
 * Fallback for scanned / image-only NY ELA PDFs when text extraction is too sparse
 * for detectElaReadingProblems(). Does not run unless the caller gates on text quality.
 */
export async function detectElaReadingScannedFallback(
  pages: { pageNumber: number; text: string }[],
  answerKeyPageCount: number,
  pageImagePaths: Map<number, string>,
): Promise<ElaScannedFallbackResult> {
  const { contentPages, answerPages, answerKeySection } = sliceContentAndAnswerPages(
    pages,
    answerKeyPageCount,
  );

  const answerKeyEntries = parseAnswerKey(answerKeySection);
  const answerKeyNumbers = answerKeyEntries.map((e) => e.problemNumber);

  const useVision =
    hasVisionExplanationProvider() && process.env.SKIP_ELA_PAGE_VISION !== "1";

  const classifications = await classifyElaPages(contentPages, pageImagePaths, {
    useVision,
    maxVisionPages: parseInt(process.env.ELA_PAGE_VISION_MAX ?? "80", 10) || 80,
  });

  const pagesByNumber = new Map(contentPages.map((p) => [p.pageNumber, p.text]));
  const visionCount = classifications.filter((c) => c.source === "vision").length;
  let { passages, regions } = buildPassagesAndRegions(
    classifications,
    pagesByNumber,
    answerKeyNumbers,
  );

  // Last resort only when vision/heuristics found nothing (not when vision ran on blank pages).
  if (regions.length === 0 && answerKeyNumbers.length >= 3 && visionCount === 0) {
    const skipCover = Math.min(4, Math.floor(classifications.length * 0.08));
    const candidatePages = classifications
      .filter((c) => c.type === "other")
      .slice(skipCover)
      .map((c) => c.pageNumber);
    const nums = answerKeyNumbers.slice(0, candidatePages.length);
    for (let i = 0; i < nums.length; i++) {
      const num = nums[i]!;
      const pageNumber = candidatePages[i]!;
      if (regions.some((r) => r.problemNumber === num)) continue;
      regions.push({
        problemNumber: num,
        pageNumber,
        rawText: "",
        cleanedText: "",
        questionType: "multiple_choice",
        requiresImage: true,
        parseWarnings: [
          "ELA scanned-PDF fallback (answer-key page order — enable vision for better layout)",
        ],
        confidence: 0.35,
      } as DetectedProblemRegion);
    }
  }
  const reason =
    visionCount > 0
      ? `sparse text; ${visionCount} pages classified with vision`
      : "sparse text; heuristic page classification only";

  return {
    passages,
    regions,
    answerKeySection,
    problemPageCount: contentPages.length,
    answerKeyPageCount: answerPages.length,
    usedVision: visionCount > 0,
    fallbackReason: reason,
  };
}
