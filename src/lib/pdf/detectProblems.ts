export type DetectedProblemRegion = {
  problemNumber: number;
  pageNumber: number;
  rawText: string;
  cleanedText: string;
  questionType: string;
  requiresImage: boolean;
  parseWarnings: string[];
  /** 0-1 */
  confidence: number;
};

import { inferQuestionType } from "@/lib/pdf/inferQuestionType";

const VISUAL_HINTS =
  /shown below|diagram|model below|line plot|number line|shaded|grid|cube|figure|table|rectangle shown|picture|chart|graph|visual/i;

const ANSWER_KEY_MARKERS =
  /^(answer\s*key|answers|scoring\s*key|scoring\s*guide|rubric)\b/i;

/** Avoid matching decimals like 15.74 — require line-start problem numbers. */
const PROBLEM_START_RE = /(?:^|\n)(\d{1,3})[\.\uFFFD\u2022\t ]\s*(?=[A-Za-z"'(])/gm;

export function splitAnswerKeySection(fullText: string): {
  problemSection: string;
  answerKeySection: string;
  answerKeyStartPage?: number;
} {
  const lines = fullText.split("\n");
  let keyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (ANSWER_KEY_MARKERS.test(lines[i]!.trim())) {
      keyStart = i;
      break;
    }
  }
  if (keyStart < 0) {
    const tail = fullText.slice(Math.floor(fullText.length * 0.75));
    if (/(?:^|\n)\d{1,3}[\.\)]\s*[A-D]\b/m.test(tail)) {
      return { problemSection: fullText.slice(0, Math.floor(fullText.length * 0.75)), answerKeySection: tail };
    }
    return { problemSection: fullText, answerKeySection: "" };
  }
  return {
    problemSection: lines.slice(0, keyStart).join("\n"),
    answerKeySection: lines.slice(keyStart).join("\n"),
  };
}

export type OnePerPageDetectionResult = {
  regions: DetectedProblemRegion[];
  answerKeySection: string;
  problemPageCount: number;
  answerKeyPageCount: number;
};

/**
 * Layout: page 1 = problem 1, … page N = problem N; trailing pages are the answer key.
 */
export function detectProblemsOnePerPage(
  pages: { pageNumber: number; text: string }[],
  answerKeyPageCount: number,
): OnePerPageDetectionResult {
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const maxPage = sorted[sorted.length - 1]?.pageNumber ?? 0;
  const trailing = Math.max(0, Math.min(answerKeyPageCount, maxPage));
  const firstAnswerPage = maxPage - trailing + 1;

  const problemPages = sorted.filter((p) => p.pageNumber < firstAnswerPage);
  const answerPages = sorted.filter((p) => p.pageNumber >= firstAnswerPage);

  const regions: DetectedProblemRegion[] = problemPages.map((p) => {
    const rawText = p.text.trim();
    const cleanedText = rawText
      .replace(/\n--\s*\d+\s+of\s+\d+\s*--/gi, "")
      .replace(/page\s+\d+/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    const requiresImage = VISUAL_HINTS.test(rawText);
    const questionType = inferQuestionType({
      rawText,
      cleanedTextLength: cleanedText.length,
    });
    const hasChoices = questionType === "multiple_choice" || questionType === "visual_multiple_choice";

    const warnings: string[] = [];
    if (requiresImage) warnings.push("Problem likely requires diagram — verify crop.");

    return {
      problemNumber: p.pageNumber,
      pageNumber: p.pageNumber,
      rawText,
      cleanedText,
      questionType,
      requiresImage,
      parseWarnings: warnings,
      confidence: 0.95,
    };
  });

  return {
    regions,
    answerKeySection: answerPages.map((p) => p.text).join("\n\n"),
    problemPageCount: problemPages.length,
    answerKeyPageCount: answerPages.length,
  };
}

export function detectProblemsFromPages(
  pages: { pageNumber: number; text: string }[],
): DetectedProblemRegion[] {
  const fullText = pages.map((p) => p.text).join("\n\n");
  const { problemSection } = splitAnswerKeySection(fullText);
  const pageOffsets: { pageNumber: number; start: number; end: number }[] = [];
  let offset = 0;
  for (const p of pages) {
    const len = p.text.length + 2;
    pageOffsets.push({ pageNumber: p.pageNumber, start: offset, end: offset + p.text.length });
    offset += len;
  }

  function pageForOffset(pos: number): number {
    for (const po of pageOffsets) {
      if (pos >= po.start && pos <= po.end) return po.pageNumber;
    }
    return pages[0]?.pageNumber ?? 1;
  }

  const matches: { num: number; index: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(PROBLEM_START_RE.source, "gm");
  while ((m = re.exec(problemSection)) !== null) {
    const num = parseInt(m[1]!, 10);
    if (num < 1 || num > 200) continue;
    const before = problemSection.slice(Math.max(0, m.index - 8), m.index);
    if (/\d\.\d*$/.test(before)) continue;
    matches.push({ num, index: m.index });
  }

  const regions: DetectedProblemRegion[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i]!.index;
    const end = matches[i + 1]?.index ?? problemSection.length;
    const rawText = problemSection.slice(start, end).trim();
    const cleanedText = rawText
      .replace(/\n--\s*\d+\s+of\s+\d+\s*--/gi, "")
      .replace(/page\s+\d+/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    const requiresImage = VISUAL_HINTS.test(rawText);
    const questionType = inferQuestionType({
      rawText,
      cleanedTextLength: cleanedText.length,
    });
    const hasChoices = questionType === "multiple_choice" || questionType === "visual_multiple_choice";

    const warnings: string[] = [];
    if (requiresImage) warnings.push("Problem likely requires diagram — verify crop.");
    if (cleanedText.length < 20) warnings.push("Very little extractable text.");

    regions.push({
      problemNumber: matches[i]!.num,
      pageNumber: pageForOffset(start),
      rawText,
      cleanedText,
      questionType,
      requiresImage,
      parseWarnings: warnings,
      confidence: cleanedText.length > 40 ? (hasChoices ? 0.75 : 0.55) : 0.35,
    });
  }

  return regions;
}
