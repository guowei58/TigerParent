const MCQ_TYPES = new Set(["multiple_choice", "visual_multiple_choice"]);

export function isMcqQuestion(
  questionType: string,
  choices: { label: string }[],
): boolean {
  if (choices.length >= 2) return true;
  return MCQ_TYPES.has(questionType);
}
