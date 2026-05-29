import {
  assessExplanationInputQuality,
  explanationContradictsAnswerKey,
} from "@/lib/ai/explanationInputQuality";
import {
  buildProblemBlock,
  buildTextExplanationSystemPrompt,
} from "@/lib/ai/explanationPrompts";
import {
  generateExplanationFromProblemImage,
  tryDeepseekTextExplanation,
} from "@/lib/ai/visionExplanation";
import {
  generateKeyAnchoredExplanation,
  generateProblemExplanation,
} from "@/lib/ai/explanationFallback";
import type { ExplanationInput, ExplanationOutput } from "@/lib/ai/generateProblemExplanation";
import { isPlaceholderAnswerKeyText } from "@/lib/pdf/answerKeyRules";
import { normalizeExplanation } from "@/lib/ai/explanationNormalize";

export function finalizeExplanation(
  parsed: ExplanationOutput,
  input: ExplanationInput,
  modelUsed: string,
): ExplanationOutput & { modelUsed: string } {
  if (input.correctChoiceLabel) {
    parsed.correctChoiceLabel = input.correctChoiceLabel;
  }
  if (input.correctAnswerText) {
    parsed.correctAnswerText = input.correctAnswerText;
  }

  if (
    input.correctChoiceLabel &&
    explanationContradictsAnswerKey(parsed.explanationStepByStep, input.correctChoiceLabel)
  ) {
    return {
      ...generateKeyAnchoredExplanation(input),
      warnings: [
        ...(parsed.warnings ?? []),
        "AI explanation contradicted the answer key — replaced with key-only text",
      ],
      modelUsed: `${modelUsed}+key-only`,
    };
  }

  return { ...parsed, modelUsed };
}

async function tryOpenAiTextExplanation(
  input: ExplanationInput,
): Promise<(ExplanationOutput & { modelUsed: string }) | null> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return null;

  const { callChatCompletions } = await import("@/lib/ai/chatCompletions");
  const content = await callChatCompletions(
    openaiKey,
    "https://api.openai.com/v1",
    process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    buildTextExplanationSystemPrompt(input),
    `Solve this problem and explain it thoroughly:\n\n${buildProblemBlock(input)}`,
  );
  if (!content) return null;

  try {
    const parsed = normalizeExplanation(JSON.parse(content) as ExplanationOutput);
    return { ...parsed, modelUsed: "openai-text" };
  } catch {
    return null;
  }
}

/**
 * Provider order: DeepSeek (text draft) → Gemini vision (preferred final) → OpenAI vision → fallbacks.
 */
export async function generateProblemExplanationWithPipeline(
  input: ExplanationInput,
): Promise<ExplanationOutput & { modelUsed: string }> {
  const deepseekDraft = await tryDeepseekTextExplanation(input);

  if (input.problemImagePath) {
    const vision = await generateExplanationFromProblemImage(
      input,
      input.problemImagePath,
      deepseekDraft,
    );
    if (vision) {
      return finalizeExplanation(vision, input, vision.modelUsed);
    }

    // Never publish unaudited DeepSeek text when we have a problem image.
    if (input.correctChoiceLabel || input.correctAnswerText) {
      const anchored = generateKeyAnchoredExplanation(input);
      return {
        ...anchored,
        warnings: [
          ...anchored.warnings,
          "Vision providers failed — using answer-key-only explanation",
        ],
        modelUsed: "key-only+vision-failed",
      };
    }
  }

  if (deepseekDraft && !input.problemImagePath) {
    return finalizeExplanation(deepseekDraft, input, deepseekDraft.modelUsed);
  }

  const quality = assessExplanationInputQuality(input);
  const hasOfficialKey = Boolean(input.correctChoiceLabel || input.correctAnswerText);
  const openResponseKey =
    hasOfficialKey &&
    !input.correctChoiceLabel &&
    isPlaceholderAnswerKeyText(input.correctAnswerText);

  if ((!quality.usable || openResponseKey) && hasOfficialKey && !input.problemImagePath) {
    const anchored = generateKeyAnchoredExplanation(input);
    return {
      ...anchored,
      warnings: [
        ...anchored.warnings,
        ...(openResponseKey ? ["Open-response item — no letter key"] : []),
        ...quality.reasons.map((r) => `Skipped AI: ${r}`),
      ],
      modelUsed: "key-only",
    };
  }

  const openaiText = await tryOpenAiTextExplanation(input);
  if (openaiText) {
    return finalizeExplanation(openaiText, input, openaiText.modelUsed);
  }

  return { ...generateProblemExplanation(input), modelUsed: "rule-based" };
}
