import type { ExplanationInput } from "@/lib/ai/generateProblemExplanation";

export type ExplanationInputQuality = {
  usable: boolean;
  reasons: string[];
};

/** PDF text extraction often drops math and choices — don't send that to AI. */
export function assessExplanationInputQuality(input: ExplanationInput): ExplanationInputQuality {
  const text = input.cleanedText.trim();
  const reasons: string[] = [];

  if (text.length < 50) {
    reasons.push("problem text too short");
  }

  const hasStructuredChoices =
    input.choices.length >= 2 ||
    /\b[A-D][\.\)]\s+\S/.test(text);

  const placeholderChoicesOnly =
    /\bA\s+B\s+C\s+D\b/i.test(text) && !hasStructuredChoices;

  if (placeholderChoicesOnly) {
    reasons.push("answer choices not extracted from PDF");
  }

  if (/shown below/i.test(text) && !/\d+\s*[x×*]\s*\d+|\d+\s*\/\s*\d+|\d{2,}/.test(text)) {
    reasons.push("references expression or diagram not present in extracted text");
  }

  if (/same value as\s*\?|same value as the fraction\s*\?/i.test(text)) {
    reasons.push("missing compared expression or fraction");
  }

  if (/has the same value as\s*$/i.test(text.trim())) {
    reasons.push("incomplete comparison expression");
  }

  if (
    input.choices.length === 0 &&
    /which (?:expression|number|set|figure|statement)/i.test(text)
  ) {
    reasons.push("multiple-choice question without extracted choices");
  }

  return { usable: reasons.length === 0, reasons };
}

export function explanationContradictsAnswerKey(
  explanationStepByStep: string,
  correctChoiceLabel: string | null,
): boolean {
  if (!correctChoiceLabel) return false;
  const key = correctChoiceLabel.toUpperCase();
  const steps = explanationStepByStep.toLowerCase();

  const therefore = steps.match(
    /therefore[^.]{0,80}correct(?:\s+choice|\s+answer)?\s+is\s+([a-d])\b/,
  );
  if (therefore && therefore[1]!.toUpperCase() !== key) return true;

  for (const letter of ["a", "b", "c", "d"]) {
    if (letter.toUpperCase() === key) continue;
    if (
      new RegExp(
        `correct (?:choice|answer) is ${letter}\\b|choice ${letter} is correct|only (?:option|choice) ${letter}\\b`,
      ).test(steps)
    ) {
      return true;
    }
  }

  return false;
}
