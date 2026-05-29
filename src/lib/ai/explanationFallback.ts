import type { ExplanationInput, ExplanationOutput } from "@/lib/ai/generateProblemExplanation";

export function generateKeyAnchoredExplanation(input: ExplanationInput): ExplanationOutput {
  const letter = input.correctChoiceLabel;
  const answer = letter ?? input.correctAnswerText ?? "unknown";
  const caveat =
    "The problem image has the full question. PDF text extraction missed numbers, fractions, or answer choices, so a step-by-step solution was not auto-generated.";

  return {
    correctChoiceLabel: input.correctChoiceLabel,
    correctAnswerText: input.correctAnswerText ?? String(answer),
    explanationShort: letter
      ? `The official answer key is choice ${letter}.`
      : `The official answer is ${answer}.`,
    explanationStepByStep: letter
      ? `1. The answer key lists choice ${letter} as correct.\n\n2. ${caveat}`
      : `1. The answer key gives ${answer}.\n\n2. ${caveat}`,
    childFriendlyExplanation: letter
      ? `According to the answer key, ${letter} is correct. Look at the problem picture and work through it with your teacher or parent.`
      : `The answer key says ${answer}. Use the problem image to practice the steps.`,
    commonMistakes: ["Rushing without reading the full problem in the image"],
    prerequisiteSkills: [`Grade ${input.gradeLevel} ${input.subject}`],
    estimatedTimeSeconds: 90,
    confidence: 0.45,
    warnings: ["Incomplete PDF text — explanation tied to answer key only"],
  };
}

export function generateProblemExplanation(input: ExplanationInput): ExplanationOutput {
  const answer =
    input.correctChoiceLabel ??
    input.correctAnswerText ??
    "unknown";

  return {
    correctChoiceLabel: input.correctChoiceLabel,
    correctAnswerText: input.correctAnswerText ?? String(answer),
    explanationShort: `The correct answer is ${answer}.`,
    explanationStepByStep: `Work through the problem step by step. The answer key indicates: ${answer}.`,
    childFriendlyExplanation: `The correct answer is ${answer}. Review each step carefully.`,
    commonMistakes: ["Not reading the full problem", "Arithmetic errors"],
    prerequisiteSkills: [`Grade ${input.gradeLevel} ${input.subject}`],
    estimatedTimeSeconds: 90,
    confidence: 0.35,
    warnings: ["Generated without AI — add API keys for full explanations"],
  };
}
