import type { ExplanationOutput } from "@/lib/ai/generateProblemExplanation";
import { normalizeExplanationText } from "@/lib/pdf/formatExplanation";

export function normalizeExplanation(parsed: ExplanationOutput): ExplanationOutput {
  const step = parsed.explanationStepByStep;
  const stepText = Array.isArray(step)
    ? (step as unknown as string[]).join("\n\n")
    : String(step ?? "");

  return {
    ...parsed,
    explanationStepByStep: normalizeExplanationText(stepText),
    explanationShort: String(parsed.explanationShort ?? ""),
    childFriendlyExplanation: String(parsed.childFriendlyExplanation ?? ""),
    correctAnswerText: String(parsed.correctAnswerText ?? ""),
    commonMistakes: Array.isArray(parsed.commonMistakes)
      ? parsed.commonMistakes.map(String)
      : [],
    prerequisiteSkills: Array.isArray(parsed.prerequisiteSkills)
      ? parsed.prerequisiteSkills.map(String)
      : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
  };
}
