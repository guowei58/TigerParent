import { hasUsableAnswerKey } from "@/lib/pdf/answerKeyRules";
import type { PdfAnswerKeyEntry } from "@/generated/prisma/client";

type ApproveCheckInput = {
  problemImagePath: string | null;
  fullPageImagePath: string | null;
  questionType: string;
  choices: { label: string }[];
  solution: { correctAnswerText: string | null } | null;
  answerKey: Pick<
    PdfAnswerKeyEntry,
    "correctChoiceLabel" | "correctAnswerText" | "rawAnswerText"
  > | null;
};

export function pdfProblemApprovalBlockReason(problem: ApproveCheckInput): string | null {
  if (!problem.problemImagePath && !problem.fullPageImagePath) {
    return "no image";
  }
  if (
    !hasUsableAnswerKey(
      problem.questionType,
      problem.choices,
      problem.answerKey,
      problem.solution?.correctAnswerText,
    )
  ) {
    return "no answer key";
  }
  return null;
}

export function canApprovePdfProblem(problem: ApproveCheckInput): boolean {
  return pdfProblemApprovalBlockReason(problem) === null;
}

export function buildApproveCheckInput(
  problem: {
    problemImagePath: string | null;
    fullPageImagePath: string | null;
    questionType: string;
    choices: { label: string }[];
    solution: { correctAnswerText: string | null } | null;
  },
  answerKey: ApproveCheckInput["answerKey"],
): ApproveCheckInput {
  return {
    problemImagePath: problem.problemImagePath,
    fullPageImagePath: problem.fullPageImagePath,
    questionType: problem.questionType,
    choices: problem.choices,
    solution: problem.solution,
    answerKey,
  };
}
