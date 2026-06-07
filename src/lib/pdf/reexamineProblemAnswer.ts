import { prisma } from "@/lib/db";
import { resolveDualModelReexamineAnswer } from "@/lib/ai/dualModelReexamine";
import {
  classifyReexamineReviewTier,
  mergeReexamineTierWarning,
  type ReexamineReviewTier,
} from "@/lib/pdf/reexamineReviewTier";
import {
  detectProblemsOnePerPage,
  splitAnswerKeySection,
} from "@/lib/pdf/detectProblems";
import { detectElaReadingProblems } from "@/lib/pdf/detectElaReading";
import { extractPdfTextByPage } from "@/lib/pdf/extractPdfText";
import {
  saveSolutionFromExplanation,
  upsertAiAnswerKeyEntry,
} from "@/lib/pdf/aiAnswerKey";
import { problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { inferQuestionType } from "@/lib/pdf/inferQuestionType";
import { parseAnswerKey } from "@/lib/pdf/parseAnswerKey";
import { resolveDataPath } from "@/lib/storage/fileStorage";
import type { PdfQuestionType } from "@/generated/prisma/client";

export type ReexamineProblemAnswerResult = {
  ok: true;
  previousAnswer: string | null;
  answer: string | null;
  answerChanged: boolean;
  keySource: "document" | "existing" | "ai";
  documentKeyFound: boolean;
  explanationGenerated: boolean;
  modelUsed: string;
  dualModelResolution: string;
  openaiAnswer: string | null;
  claudeAnswer: string | null;
  reviewTier: ReexamineReviewTier;
  reviewReason: string;
  message: string;
};

function formatAnswer(key: {
  correctChoiceLabel: string | null;
  correctAnswerText: string | null;
} | null): string | null {
  if (!key) return null;
  return key.correctChoiceLabel ?? key.correctAnswerText ?? null;
}

async function loadDocumentPages(sourceDocumentId: string, originalFilePath: string) {
  const cached = await prisma.pdfPage.findMany({
    where: { sourceDocumentId },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true, textRaw: true },
  });

  if (cached.length > 0 && cached.every((p) => p.textRaw != null)) {
    return cached.map((p) => ({ pageNumber: p.pageNumber, text: p.textRaw! }));
  }

  return extractPdfTextByPage(resolveDataPath(originalFilePath));
}

function answerKeySectionForDocument(
  pages: { pageNumber: number; text: string }[],
  layout: string,
  answerKeyPageCount: number,
): string {
  if (layout === "ela_reading_passages") {
    return detectElaReadingProblems(pages, answerKeyPageCount).answerKeySection;
  }
  if (layout === "one_problem_per_page") {
    return detectProblemsOnePerPage(pages, answerKeyPageCount).answerKeySection;
  }
  const fullText = pages.map((p) => p.text).join("\n");
  return splitAnswerKeySection(fullText).answerKeySection;
}

export async function reexamineProblemAnswer(
  problemId: string,
): Promise<ReexamineProblemAnswerResult> {
  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id: problemId },
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
      solution: true,
      passage: true,
      sourceDocument: true,
    },
  });

  if (!problem) {
    throw new Error("Problem not found");
  }

  const doc = problem.sourceDocument;
  const pages = await loadDocumentPages(doc.id, doc.originalFilePath);
  const layout = doc.ingestionLayout ?? "one_problem_per_page";
  const answerKeySection = answerKeySectionForDocument(
    pages,
    layout,
    doc.answerKeyPageCount ?? 1,
  );

  const parsedEntry = parseAnswerKey(answerKeySection).find(
    (e) => e.problemNumber === problem.problemNumber,
  );

  const existingKey = await prisma.pdfAnswerKeyEntry.findUnique({
    where: {
      sourceDocumentId_problemNumber: {
        sourceDocumentId: doc.id,
        problemNumber: problem.problemNumber,
      },
    },
  });

  const previousAnswer = formatAnswer(existingKey);
  let key = existingKey;
  const documentKeyFound = Boolean(parsedEntry);
  let keySource: ReexamineProblemAnswerResult["keySource"] = parsedEntry
    ? "document"
    : existingKey
      ? "existing"
      : "ai";

  if (parsedEntry) {
    key = await prisma.pdfAnswerKeyEntry.upsert({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: doc.id,
          problemNumber: problem.problemNumber,
        },
      },
      create: {
        sourceDocumentId: doc.id,
        problemNumber: problem.problemNumber,
        rawAnswerText: parsedEntry.rawAnswerText,
        correctChoiceLabel: parsedEntry.correctChoiceLabel,
        correctAnswerText: parsedEntry.correctAnswerText,
        extractionConfidence: parsedEntry.extractionConfidence,
        warnings: [...parsedEntry.warnings, "Re-parsed from document on admin reexamine"],
      },
      update: {
        rawAnswerText: parsedEntry.rawAnswerText,
        correctChoiceLabel: parsedEntry.correctChoiceLabel,
        correctAnswerText: parsedEntry.correctAnswerText,
        extractionConfidence: parsedEntry.extractionConfidence,
        warnings: [...parsedEntry.warnings, "Re-parsed from document on admin reexamine"],
      },
    });
  }

  const choiceRows = problem.choices.map((c) => ({ label: c.label, text: c.text }));
  const passageText = problem.passage?.bodyText ?? null;

  const dualResult = await resolveDualModelReexamineAnswer({
    cleanedText: problem.rawText ?? problem.cleanedText ?? "",
    choices: choiceRows,
    correctChoiceLabel: null,
    correctAnswerText: null,
    gradeLevel: problem.gradeLevel ?? doc.gradeLevel ?? 5,
    subject: problem.subject ?? doc.subject ?? "math",
    conceptName: problem.subtopic ?? undefined,
    problemImagePath: problemDisplayImagePath(problem),
    passageText,
  });

  const answerText = dualResult.correctAnswerText.trim();
  if (!answerText || answerText.toLowerCase() === "unknown") {
    throw new Error(`Dual-model reexamine returned no usable answer for problem #${problem.problemNumber}`);
  }

  const openResponse = problem.questionType === "open_response";
  const choiceLabel =
    openResponse ||
    !dualResult.correctChoiceLabel ||
    !/^[A-D]$/i.test(dualResult.correctChoiceLabel.trim())
      ? null
      : dualResult.correctChoiceLabel.trim().toUpperCase();

  key = await upsertAiAnswerKeyEntry(doc.id, problem.problemNumber, {
    correctChoiceLabel: choiceLabel,
    correctAnswerText: answerText,
    confidence: dualResult.confidence,
  });
  keySource = "ai";

  await saveSolutionFromExplanation(problem.id, key.id, dualResult, key, true);

  const modelUsed = dualResult.modelUsed;
  const explanationGenerated = true;
  const dualModelResolution = dualResult.resolution;
  const openaiAnswer = dualResult.openaiAnswer;
  const claudeAnswer = dualResult.claudeAnswer;
  const answer = formatAnswer(key);
  const answerChanged = previousAnswer !== answer;
  const { tier: reviewTier, reason: reviewReason } = classifyReexamineReviewTier({
    resolution: dualResult.resolution,
    confidence: dualResult.confidence,
    answerChanged,
    documentKeyFound,
    claudeUnavailableReason: dualResult.claudeUnavailableReason,
  });

  const questionType = inferQuestionType({
    rawText: problem.rawText ?? "",
    correctChoiceLabel: key?.correctChoiceLabel,
    correctAnswerText: key?.correctAnswerText,
    cleanedTextLength: problem.cleanedText?.length,
    choiceCount: choiceRows.length,
  }) as PdfQuestionType;

  await prisma.pdfPracticeProblem.update({
    where: { id: problemId },
    data: {
      questionType,
      answerKeyConfidence: key?.extractionConfidence ?? problem.answerKeyConfidence,
      approvedForStudentUse: false,
      reviewStatus: "needs_review",
      parseWarnings: mergeReexamineTierWarning(problem.parseWarnings, reviewTier, reviewReason),
    },
  });

  let message: string;
  const resolutionNote =
    dualModelResolution === "consensus"
      ? "ChatGPT and Claude agreed."
      : dualModelResolution === "arbitrated"
        ? `ChatGPT (${openaiAnswer}) and Claude (${claudeAnswer}) disagreed — arbitrated to ${answer}.`
        : dualModelResolution === "openai-only"
          ? "Only ChatGPT available (Claude unavailable)."
          : "Only Claude available (ChatGPT unavailable).";

  if (parsedEntry) {
    message = answerChanged
      ? `Document key was ${previousAnswer ?? "none"}; dual-model reexamine set ${answer}. ${resolutionNote} Problem unapproved — review and approve again.`
      : `Dual-model reexamine confirmed ${answer} (matches document key). ${resolutionNote} Explanation regenerated. Problem unapproved — review and approve again.`;
  } else {
    message = `No document key for #${problem.problemNumber}; dual-model set answer to ${answer}. ${resolutionNote} Problem unapproved — review and approve again.`;
  }

  return {
    ok: true,
    previousAnswer,
    answer,
    answerChanged,
    keySource,
    documentKeyFound,
    explanationGenerated,
    modelUsed,
    dualModelResolution,
    openaiAnswer,
    claudeAnswer,
    reviewTier,
    reviewReason,
    message,
  };
}
