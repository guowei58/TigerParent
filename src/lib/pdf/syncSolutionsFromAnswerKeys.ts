import type { PdfQuestionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { detectProblemsOnePerPage } from "@/lib/pdf/detectProblems";
import { parseAnswerKey } from "@/lib/pdf/parseAnswerKey";
import { isPlaceholderAnswerKeyText } from "@/lib/pdf/answerKeyRules";
import { inferQuestionType } from "@/lib/pdf/inferQuestionType";

export async function reparseAndSyncAnswerKeys(sourceDocumentId: string) {
  const doc = await prisma.pdfSourceDocument.findUniqueOrThrow({
    where: { id: sourceDocumentId },
  });
  const pages = await prisma.pdfPage.findMany({
    where: { sourceDocumentId },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true, textRaw: true },
  });

  const { answerKeySection } = detectProblemsOnePerPage(
    pages.map((p) => ({ pageNumber: p.pageNumber, text: p.textRaw ?? "" })),
    doc.answerKeyPageCount,
  );

  const entries = parseAnswerKey(answerKeySection);

  for (const entry of entries) {
    await prisma.pdfAnswerKeyEntry.upsert({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId,
          problemNumber: entry.problemNumber,
        },
      },
      create: {
        sourceDocumentId,
        problemNumber: entry.problemNumber,
        rawAnswerText: entry.rawAnswerText,
        correctChoiceLabel: entry.correctChoiceLabel,
        correctAnswerText: entry.correctAnswerText,
        extractionConfidence: entry.extractionConfidence,
        warnings: entry.warnings,
      },
      update: {
        rawAnswerText: entry.rawAnswerText,
        correctChoiceLabel: entry.correctChoiceLabel,
        correctAnswerText: entry.correctAnswerText,
        extractionConfidence: entry.extractionConfidence,
        warnings: entry.warnings,
      },
    });
  }

  const problems = await prisma.pdfPracticeProblem.findMany({
    where: { sourceDocumentId },
  });

  let matched = 0;
  let solutionsUpdated = 0;
  let typesUpdated = 0;

  for (const p of problems) {
    const key = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId,
          problemNumber: p.problemNumber,
        },
      },
    });

    if (key) {
      matched++;
      const warnings = ((p.parseWarnings as string[]) ?? []).filter(
        (w) => w !== "No answer key entry matched",
      );
      const choiceCount = await prisma.pdfAnswerChoice.count({
        where: { problemId: p.id },
      });
      const questionType = inferQuestionType({
        rawText: p.rawText ?? "",
        correctChoiceLabel: key.correctChoiceLabel,
        correctAnswerText: key.correctAnswerText,
        choiceCount,
      }) as PdfQuestionType;
      const openResponse = questionType === "open_response";
      const placeholderKey =
        (key.correctChoiceLabel != null &&
          isPlaceholderAnswerKeyText(key.correctChoiceLabel)) ||
        (key.correctAnswerText != null && isPlaceholderAnswerKeyText(key.correctAnswerText));

      await prisma.pdfPracticeProblem.update({
        where: { id: p.id },
        data: {
          answerKeyConfidence: key.extractionConfidence,
          parseWarnings: warnings,
          questionType,
        },
      });
      if (questionType !== p.questionType) typesUpdated++;

      const answerText = key.correctAnswerText ?? key.correctChoiceLabel;
      if (placeholderKey || openResponse) {
        await prisma.pdfProblemSolution.upsert({
          where: { problemId: p.id },
          create: {
            problemId: p.id,
            answerKeyEntryId: key.id,
            correctChoiceLabel: null,
            correctAnswerText: placeholderKey ? null : answerText,
            generationStatus: "needs_human_review",
            confidence: key.extractionConfidence,
          },
          update: {
            answerKeyEntryId: key.id,
            correctChoiceLabel: null,
            correctAnswerText: placeholderKey ? null : answerText,
            generationStatus: "needs_human_review",
            confidence: key.extractionConfidence,
          },
        });
        solutionsUpdated++;
      } else if (answerText && !isPlaceholderAnswerKeyText(answerText)) {
        await prisma.pdfProblemSolution.upsert({
          where: { problemId: p.id },
          create: {
            problemId: p.id,
            answerKeyEntryId: key.id,
            correctChoiceLabel: key.correctChoiceLabel,
            correctAnswerText: answerText,
            generationStatus: "needs_human_review",
            confidence: key.extractionConfidence,
          },
          update: {
            answerKeyEntryId: key.id,
            correctChoiceLabel: key.correctChoiceLabel,
            correctAnswerText: answerText,
            confidence: key.extractionConfidence,
          },
        });
        solutionsUpdated++;
      }
    }
  }

  return {
    entriesParsed: entries.length,
    problemsMatched: matched,
    solutionsUpdated,
    typesUpdated,
  };
}
