import { isMcqQuestion } from "@/lib/pdf/isMcqQuestion";

const PLACEHOLDER_RE =
  /^\[?\s*(response|drawing|graph|table|see\s+work|open\s*response|short\s*answer|n\/a)\s*\]?$/i;

export function isParsedMcqChoiceLabel(label: string | null | undefined): boolean {
  return Boolean(label?.trim() && /^[A-D]$/i.test(label.trim()));
}

export function isPlaceholderAnswerKeyText(text: string | null | undefined): boolean {
  if (!text?.trim()) return true;
  const t = text.trim();
  if (PLACEHOLDER_RE.test(t)) return true;
  if (/^\[[^\]]+\]$/i.test(t) && /response|drawing|graph|rubric|open/i.test(t)) return true;
  return false;
}

export function needsAiDerivedAnswerKey(
  questionType: string,
  choices: { label: string }[],
  key: {
    correctChoiceLabel: string | null;
    correctAnswerText: string | null;
    rawAnswerText?: string;
  } | null,
): boolean {
  const mcq = isMcqQuestion(questionType, choices);
  if (!key) return true;
  if (isParsedMcqChoiceLabel(key.correctChoiceLabel)) {
    return false;
  }
  const text = (key.correctAnswerText ?? key.rawAnswerText ?? "").trim();
  if (isPlaceholderAnswerKeyText(text) || isPlaceholderAnswerKeyText(key.correctChoiceLabel)) {
    return true;
  }
  if (!mcq) return true;
  return false;
}

export function hasUsableAnswerKey(
  questionType: string,
  choices: { label: string }[],
  key: {
    correctChoiceLabel: string | null;
    correctAnswerText: string | null;
    rawAnswerText?: string;
  } | null,
  solutionCorrectAnswerText: string | null | undefined,
): boolean {
  if (solutionCorrectAnswerText && !isPlaceholderAnswerKeyText(solutionCorrectAnswerText)) {
    return true;
  }
  if (!key) return false;
  if (isMcqQuestion(questionType, choices)) {
    return Boolean(key.correctChoiceLabel && !isPlaceholderAnswerKeyText(key.correctChoiceLabel));
  }
  const text = key.correctAnswerText ?? key.rawAnswerText ?? "";
  return Boolean(text.trim()) && !isPlaceholderAnswerKeyText(text);
}
