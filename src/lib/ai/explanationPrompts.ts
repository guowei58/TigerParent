import type { ExplanationInput } from "@/lib/ai/generateProblemExplanation";

export function buildTextExplanationSystemPrompt(input: ExplanationInput): string {
  const noOfficialKey = !input.correctChoiceLabel && !input.correctAnswerText;
  return `You are an expert ${input.subject} tutor for grade ${input.gradeLevel} students.
You will receive a test problem (text extracted from a PDF; formatting may be incomplete).
Solve ONLY what is stated in the text. Do not invent numbers, fractions, or expressions that are not in the problem text.
If critical information is missing, say so in warnings and keep the explanation short.
If an official answer key is provided, your explanation MUST support that answer — do not contradict it.
Never conclude a different multiple-choice letter than the official answer key.
${
  noOfficialKey
    ? `No official answer key was provided — you must solve the problem yourself.
correctAnswerText MUST be a short, exact-match grading string (e.g. "45", "$90", "2 1/2").
Do NOT put the full explanation in correctAnswerText.`
    : ""
}
Return strict JSON only with keys:
correctChoiceLabel, correctAnswerText, explanationShort (1-2 sentences),
explanationStepByStep (detailed multi-step solution: use format "1. ...\\n\\n2. ...\\n\\n3. ..." with plain numbers only, never "Step 1" — NOT an array),
childFriendlyExplanation (warm, encouraging summary),
commonMistakes (string array), prerequisiteSkills (string array),
estimatedTimeSeconds (number), confidence (0-1), warnings (string array).`;
}

export function buildVisionExplanationSystemPrompt(input: ExplanationInput): string {
  const noOfficialKey = !input.correctChoiceLabel && !input.correctAnswerText;
  return `You are an expert ${input.subject} tutor for grade ${input.gradeLevel} students.
You are given an image of a standardized test problem. Read the image carefully — include fractions, diagrams, tables, and all multiple-choice options.
Write a clear step-by-step solution a student can learn from.
If an official answer key is provided, your explanation MUST support that answer exactly.
${
  noOfficialKey
    ? "Solve the problem from the image. correctAnswerText must be a short grading string (e.g. a letter A-D, a number, or brief phrase)."
    : "Do not change the official answer key letter or value."
}
Return strict JSON only with keys:
correctChoiceLabel, correctAnswerText, explanationShort (1-2 sentences),
explanationStepByStep (format "1. ...\\n\\n2. ...\\n\\n3. ..." — NOT an array),
childFriendlyExplanation, commonMistakes (string array), prerequisiteSkills (string array),
estimatedTimeSeconds (number), confidence (0-1), warnings (string array).`;
}

export function buildProblemBlock(input: ExplanationInput): string {
  const lines = [input.cleanedText.trim()];
  if (input.choices.length > 0) {
    lines.push("");
    lines.push("Answer choices:");
    for (const c of input.choices) {
      lines.push(`${c.label}. ${c.text ?? "(see diagram)"}`);
    }
  }
  if (input.correctChoiceLabel || input.correctAnswerText) {
    lines.push("");
    lines.push(
      `Official answer key: ${input.correctChoiceLabel ?? input.correctAnswerText ?? "unknown"}`,
    );
  }
  return lines.join("\n");
}
