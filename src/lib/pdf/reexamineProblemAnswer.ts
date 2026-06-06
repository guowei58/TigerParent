import { prisma } from "@/lib/db";
import { generateProblemExplanationWithAi } from "@/lib/ai/generateProblemExplanation";
import {
  detectProblemsOnePerPage,
  splitAnswerKeySection,
} from "@/lib/pdf/detectProblems";
import { detectElaReadingProblems } from "@/lib/pdf/detectElaReading";
import { extractPdfTextByPage } from "@/lib/pdf/extractPdfText";
import {
  ensureAiAnswerKeyForProblem,
  saveSolutionFromExplanation,
  trustedAnswerKeyForAi,
} from "@/lib/pdf/aiAnswerKey";
import { needsAiDerivedAnswerKey } from "@/lib/pdf/answerKeyRules";
import { problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { inferQuestionType } from "@/lib/pdf/inferQuestionType";
import { parseAnswerKey } from "@/lib/pdf/parseAnswerKey";
import { problemExplanationText } from "@/lib/pdf/problemExplanation";
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
  const needsAi = needsAiDerivedAnswerKey(problem.questionType, choiceRows, key);

  let modelUsed = "none";
  let explanationGenerated = false;

  if (needsAi) {
    const aiResult = await ensureAiAnswerKeyForProblem({
      id: problem.id,
      sourceDocumentId: doc.id,
      problemNumber: problem.problemNumber,
      questionType: problem.questionType,
      rawText: problem.rawText,
      cleanedText: problem.cleanedText,
      gradeLevel: problem.gradeLevel ?? doc.gradeLevel ?? 5,
      subject: problem.subject ?? doc.subject ?? "math",
      subtopic: problem.subtopic,
      problemImagePath: problem.problemImagePath,
      fullPageImagePath: problem.fullPageImagePath,
      passageText,
      choices: choiceRows,
      key: key
        ? {
            id: key.id,
            correctChoiceLabel: key.correctChoiceLabel,
            correctAnswerText: key.correctAnswerText,
            rawAnswerText: key.rawAnswerText,
          }
        : null,
    });

    key = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: doc.id,
          problemNumber: problem.problemNumber,
        },
      },
    });
    if (!documentKeyFound) keySource = "ai";
    modelUsed = aiResult.action === "updated" ? aiResult.modelUsed : "skipped";
    explanationGenerated = aiResult.action === "updated";
  } else {
    if (!key) {
      throw new Error(
        `No answer key found in document for problem #${problem.problemNumber} and no existing key to use.`,
      );
    }

    const trusted = trustedAnswerKeyForAi(key, false);
    const expl = await generateProblemExplanationWithAi({
      cleanedText: problem.rawText ?? problem.cleanedText ?? "",
      choices: choiceRows,
      correctChoiceLabel: trusted.correctChoiceLabel,
      correctAnswerText: trusted.correctAnswerText,
      gradeLevel: problem.gradeLevel ?? doc.gradeLevel ?? 5,
      subject: problem.subject ?? doc.subject ?? "english",
      conceptName: problem.subtopic ?? undefined,
      problemImagePath: problemDisplayImagePath(problem),
      passageText,
    });

    await saveSolutionFromExplanation(problem.id, key.id, expl, key, false);
    modelUsed = expl.modelUsed;
    explanationGenerated = Boolean(problemExplanationText(expl));
  }

  const answer = formatAnswer(key);
  const answerChanged = previousAnswer !== answer;

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
    },
  });

  let message: string;
  if (parsedEntry) {
    message = answerChanged
      ? `Re-parsed answer from document: ${answer} (was ${previousAnswer ?? "none"}). Explanation regenerated. Problem unapproved — review and approve again.`
      : `Confirmed answer from document: ${answer}. Explanation regenerated. Problem unapproved — review and approve again.`;
  } else if (keySource === "ai") {
    message = `No document key for #${problem.problemNumber}; AI set answer to ${answer}. Explanation regenerated. Problem unapproved — review and approve again.`;
  } else {
    message = `No document key found; kept existing answer ${answer ?? "none"}. Explanation regenerated. Problem unapproved — review and approve again.`;
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
    message,
  };
}
