import { isPlaceholderAnswerKeyText } from "@/lib/pdf/answerKeyRules";

type SolutionLike = {
  correctAnswerText?: string | null;
  explanationStepByStep?: string | null;
  childFriendlyExplanation?: string | null;
  explanationShort?: string | null;
} | null | undefined;

type KeyLike = {
  correctAnswerText?: string | null;
  rawAnswerText?: string | null;
} | null | undefined;

export type OpenResponseReveal = {
  sampleAnswer: string | null;
  explanation: string | null;
};

export function problemSampleAnswerText(
  solution: SolutionLike,
  key?: KeyLike,
): string | null {
  for (const candidate of [
    solution?.correctAnswerText,
    key?.correctAnswerText,
    key?.rawAnswerText,
  ]) {
    if (candidate?.trim() && !isPlaceholderAnswerKeyText(candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

export function problemExplanationText(solution: SolutionLike): string | null {
  if (!solution) return null;
  return (
    solution.explanationStepByStep ??
    solution.explanationShort ??
    solution.childFriendlyExplanation ??
    null
  );
}

export function openResponseReveal(
  solution: SolutionLike,
  key?: KeyLike,
): OpenResponseReveal {
  const sampleAnswer = problemSampleAnswerText(solution, key);
  let explanation = problemExplanationText(solution);

  if (
    explanation &&
    sampleAnswer &&
    explanation.trim() === sampleAnswer.trim()
  ) {
    explanation =
      solution?.explanationShort ??
      solution?.childFriendlyExplanation ??
      null;
  }

  return { sampleAnswer, explanation };
}

export function shouldShowOpenResponseExplanation(
  questionType: string,
  progressStatus: string | null | undefined,
): boolean {
  if (!progressStatus || progressStatus === "skipped") return false;
  if (questionType !== "open_response" && questionType !== "short_answer") return false;
  return (
    progressStatus === "submitted" ||
    progressStatus === "correct" ||
    progressStatus === "incorrect"
  );
}
