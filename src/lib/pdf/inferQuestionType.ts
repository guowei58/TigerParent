import { isPlaceholderAnswerKeyText } from "@/lib/pdf/answerKeyRules";

const VISUAL_HINTS =
  /shown below|diagram|model below|line plot|number line|shaded|grid|cube|figure|table|rectangle shown|picture|chart|graph|visual/i;

const OPEN_RESPONSE_HINTS =
  /\bexplain your|show your work|short\s+answer|open\s+response|list all|write the|describe one|worth \d+ credits?/i;

export function textLooksLikeMcq(rawText: string): boolean {
  if (/\bA[\.\)]\s/.test(rawText) || /\bB[\.\)]\s/.test(rawText)) return true;
  if (/\bA\s+B\s+C\s+D\b/i.test(rawText)) return true;
  if (/(?:^|\n)\s*[A-D][\.\)]\s+\S/m.test(rawText)) return true;
  if (
    /which (?:expression|number|set|figure|statement|equation)/i.test(rawText) &&
    /\b[A-D]\b/.test(rawText)
  ) {
    return true;
  }
  return false;
}

export function isMcqAnswerKeyLetter(label: string | null | undefined): boolean {
  return Boolean(label?.trim() && /^[A-D]$/i.test(label.trim()));
}

export function inferQuestionType(params: {
  rawText: string;
  correctChoiceLabel?: string | null;
  correctAnswerText?: string | null;
  cleanedTextLength?: number;
  choiceCount?: number;
}): string {
  const { rawText, correctChoiceLabel, correctAnswerText } = params;
  const requiresImage = VISUAL_HINTS.test(rawText);
  const choiceCount = params.choiceCount ?? 0;

  if (
    (correctChoiceLabel != null && isPlaceholderAnswerKeyText(correctChoiceLabel)) ||
    (correctAnswerText != null && isPlaceholderAnswerKeyText(correctAnswerText))
  ) {
    return "open_response";
  }

  if (OPEN_RESPONSE_HINTS.test(rawText)) return "open_response";

  const hasChoicesInText = textLooksLikeMcq(rawText);
  const hasStructuredChoices = choiceCount >= 2;

  if (isMcqAnswerKeyLetter(correctChoiceLabel)) {
    if (hasChoicesInText || hasStructuredChoices) {
      return requiresImage ? "visual_multiple_choice" : "multiple_choice";
    }
    const len = params.cleanedTextLength ?? rawText.replace(/\s+/g, " ").trim().length;
    if (len === 0) {
      return requiresImage ? "visual_multiple_choice" : "multiple_choice";
    }
    return "open_response";
  }

  if (requiresImage && hasChoicesInText) return "visual_multiple_choice";
  if (hasChoicesInText) return "multiple_choice";

  const len = params.cleanedTextLength ?? rawText.replace(/\s+/g, " ").trim().length;
  if (len > 20) return "short_answer";
  return "unknown";
}
