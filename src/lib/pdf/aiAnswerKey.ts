import { prisma } from "@/lib/db";
import {
  generateProblemExplanationWithAi,
  type ExplanationOutput,
} from "@/lib/ai/generateProblemExplanation";
import { needsAiDerivedAnswerKey } from "@/lib/pdf/answerKeyRules";

export {
  hasUsableAnswerKey,
  isPlaceholderAnswerKeyText,
  needsAiDerivedAnswerKey,
} from "@/lib/pdf/answerKeyRules";

export function trustedAnswerKeyForAi(
  key: {
    correctChoiceLabel: string | null;
    correctAnswerText: string | null;
  } | null,
  needsAi: boolean,
): { correctChoiceLabel: string | null; correctAnswerText: string | null } {
  if (!key || needsAi) {
    return { correctChoiceLabel: null, correctAnswerText: null };
  }
  return {
    correctChoiceLabel: key.correctChoiceLabel,
    correctAnswerText: key.correctAnswerText,
  };
}

export async function upsertAiAnswerKeyEntry(
  sourceDocumentId: string,
  problemNumber: number,
  answer: {
    correctChoiceLabel: string | null;
    correctAnswerText: string;
    confidence: number;
  },
) {
  return prisma.pdfAnswerKeyEntry.upsert({
    where: {
      sourceDocumentId_problemNumber: { sourceDocumentId, problemNumber },
    },
    create: {
      sourceDocumentId,
      problemNumber,
      rawAnswerText: answer.correctAnswerText,
      correctChoiceLabel: answer.correctChoiceLabel,
      correctAnswerText: answer.correctAnswerText,
      extractionConfidence: answer.confidence,
      warnings: ["AI-derived answer key"],
    },
    update: {
      rawAnswerText: answer.correctAnswerText,
      correctChoiceLabel: answer.correctChoiceLabel,
      correctAnswerText: answer.correctAnswerText,
      extractionConfidence: answer.confidence,
      warnings: ["AI-derived answer key"],
    },
  });
}

export async function saveSolutionFromExplanation(
  problemId: string,
  answerKeyEntryId: string,
  expl: ExplanationOutput & { modelUsed: string },
  key: { correctChoiceLabel: string | null; correctAnswerText: string | null } | null,
  needsAi: boolean,
) {
  const trusted = trustedAnswerKeyForAi(key, needsAi);
  const genStatus =
    expl.confidence < 0.5 ? "needs_human_review" : needsAi ? "generated" : "generated";

  await prisma.pdfProblemSolution.upsert({
    where: { problemId },
    create: {
      problemId,
      answerKeyEntryId,
      correctChoiceLabel: trusted.correctChoiceLabel ?? expl.correctChoiceLabel,
      correctAnswerText: trusted.correctAnswerText ?? expl.correctAnswerText,
      explanationShort: expl.explanationShort,
      explanationStepByStep: expl.explanationStepByStep,
      childFriendlyExplanation: expl.childFriendlyExplanation,
      commonMistakes: expl.commonMistakes,
      prerequisiteSkills: expl.prerequisiteSkills,
      estimatedTimeSeconds: expl.estimatedTimeSeconds,
      generatedByModel: expl.modelUsed,
      generationStatus: genStatus,
      confidence: expl.confidence,
    },
    update: {
      answerKeyEntryId,
      correctChoiceLabel: trusted.correctChoiceLabel ?? expl.correctChoiceLabel,
      correctAnswerText: needsAi
        ? expl.correctAnswerText
        : (trusted.correctAnswerText ?? expl.correctAnswerText),
      explanationShort: expl.explanationShort,
      explanationStepByStep: expl.explanationStepByStep,
      childFriendlyExplanation: expl.childFriendlyExplanation,
      commonMistakes: expl.commonMistakes,
      prerequisiteSkills: expl.prerequisiteSkills,
      generatedByModel: expl.modelUsed,
      generationStatus: genStatus,
      confidence: expl.confidence,
    },
  });
}

export type EnsureAiAnswerKeyResult =
  | { action: "skipped"; reason: "mcq_with_key" }
  | { action: "updated"; answerText: string; modelUsed: string };

export async function ensureAiAnswerKeyForProblem(problem: {
  id: string;
  sourceDocumentId: string;
  problemNumber: number;
  questionType: string;
  rawText: string | null;
  cleanedText: string | null;
  gradeLevel: number | null;
  subject: string | null;
  subtopic: string | null;
  problemImagePath?: string | null;
  fullPageImagePath?: string | null;
  passageText?: string | null;
  choices: { label: string; text: string | null }[];
  key: {
    id: string;
    correctChoiceLabel: string | null;
    correctAnswerText: string | null;
    rawAnswerText: string;
  } | null;
}): Promise<EnsureAiAnswerKeyResult> {
  const needsAi = needsAiDerivedAnswerKey(problem.questionType, problem.choices, problem.key);
  if (!needsAi) {
    return { action: "skipped", reason: "mcq_with_key" };
  }

  const trusted = trustedAnswerKeyForAi(problem.key, true);
  const { problemDisplayImagePath } = await import("@/lib/pdf/displayPaths");
  const expl = await generateProblemExplanationWithAi({
    cleanedText: problem.rawText ?? problem.cleanedText ?? "",
    choices: problem.choices,
    correctChoiceLabel: trusted.correctChoiceLabel,
    correctAnswerText: trusted.correctAnswerText,
    gradeLevel: problem.gradeLevel ?? 5,
    subject: problem.subject ?? "math",
    conceptName: problem.subtopic ?? undefined,
    problemImagePath: problemDisplayImagePath(problem),
    passageText: problem.passageText,
  });

  const answerText = (expl.correctAnswerText ?? "").trim();
  if (!answerText || answerText.toLowerCase() === "unknown") {
    throw new Error(`AI returned no usable answer for problem #${problem.problemNumber}`);
  }

  const openResponse = problem.questionType === "open_response";
  const choiceLabel =
    openResponse || !expl.correctChoiceLabel || !/^[A-D]$/i.test(expl.correctChoiceLabel.trim())
      ? null
      : expl.correctChoiceLabel;

  const entry = await upsertAiAnswerKeyEntry(problem.sourceDocumentId, problem.problemNumber, {
    correctChoiceLabel: choiceLabel,
    correctAnswerText: answerText,
    confidence: expl.confidence,
  });

  await saveSolutionFromExplanation(problem.id, entry.id, expl, problem.key, true);

  return { action: "updated", answerText, modelUsed: expl.modelUsed };
}
