import {
  anthropicUserWithImage,
  callAnthropicMessages,
} from "@/lib/ai/anthropicMessages";
import { callChatCompletions } from "@/lib/ai/chatCompletions";
import { buildProblemBlock } from "@/lib/ai/explanationPrompts";
import { normalizeExplanation } from "@/lib/ai/explanationNormalize";
import type { ExplanationInput, ExplanationOutput } from "@/lib/ai/generateProblemExplanation";
import { loadProblemImagePng } from "@/lib/ai/visionExplanation";

export type DualModelResolution =
  | "openai-only"
  | "claude-only"
  | "consensus"
  | "arbitrated";

export type DualModelReexamineResult = ExplanationOutput & {
  modelUsed: string;
  resolution: DualModelResolution;
  openaiAnswer: string | null;
  claudeAnswer: string | null;
  claudeUnavailableReason: string | null;
};

type ModelResult = ExplanationOutput & { modelUsed: string };

function reexamineSystemPrompt(input: ExplanationInput): string {
  return `You are an expert ${input.subject} tutor for grade ${input.gradeLevel} students.
You are re-examining a test problem to determine the correct answer independently.
Read the problem carefully${input.problemImagePath ? " using the attached image" : ""}.
Do not assume any existing answer key is correct — solve the problem yourself.
Return strict JSON only with keys:
correctChoiceLabel (A-D for multiple choice, or null for open response),
correctAnswerText (short exact grading string, e.g. "45", "$90", "2 1/2", or the choice letter),
explanationShort (1-2 sentences),
explanationStepByStep (format "1. ...\\n\\n2. ...\\n\\n3. ..." — NOT an array),
childFriendlyExplanation,
commonMistakes (string array), prerequisiteSkills (string array),
estimatedTimeSeconds (number), confidence (0-1), warnings (string array).`;
}

function reexamineUserText(input: ExplanationInput): string {
  const lines = [
    "Solve this problem and determine the correct answer:",
    "",
  ];
  if (input.problemImagePath) {
    lines.push(
      "The attached image shows the full problem. Use the image as the primary source of truth.",
      "",
    );
  }
  lines.push(buildProblemBlock({ ...input, correctChoiceLabel: null, correctAnswerText: null }));
  lines.push("", "Return strict JSON only.");
  return lines.join("\n");
}

function parseModelJson(content: string | null): ModelResult | null {
  if (!content) return null;
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return null;
  try {
    return normalizeExplanation(JSON.parse(jsonText) as ExplanationOutput) as ModelResult;
  } catch {
    return null;
  }
}

function normalizeAnswerText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^\$/, "")
    .replace(/[.,]+$/, "");
}

function formatAnswerSummary(result: ExplanationOutput): string {
  if (result.correctChoiceLabel?.trim()) {
    const label = result.correctChoiceLabel.trim().toUpperCase();
    const text = result.correctAnswerText?.trim();
    return text ? `Choice ${label} (${text})` : `Choice ${label}`;
  }
  return result.correctAnswerText?.trim() || "unknown";
}

export function dualModelAnswersMatch(
  a: ExplanationOutput,
  b: ExplanationOutput,
): boolean {
  const labelA = a.correctChoiceLabel?.trim().toUpperCase() ?? null;
  const labelB = b.correctChoiceLabel?.trim().toUpperCase() ?? null;

  if (labelA && labelB) return labelA === labelB;

  if (labelA && !labelB) {
    const textB = normalizeAnswerText(b.correctAnswerText ?? "");
    return textB === labelA.toLowerCase() || textB.startsWith(labelA.toLowerCase());
  }
  if (labelB && !labelA) {
    const textA = normalizeAnswerText(a.correctAnswerText ?? "");
    return textA === labelB.toLowerCase() || textA.startsWith(labelB.toLowerCase());
  }

  const textA = normalizeAnswerText(a.correctAnswerText ?? "");
  const textB = normalizeAnswerText(b.correctAnswerText ?? "");
  if (!textA || !textB) return false;
  if (textA === textB) return true;

  const numA = Number(textA.replace(/[^0-9.\-/]/g, ""));
  const numB = Number(textB.replace(/[^0-9.\-/]/g, ""));
  if (Number.isFinite(numA) && Number.isFinite(numB) && numA === numB) return true;

  return false;
}

async function tryOpenAiReexamine(
  input: ExplanationInput,
  imagePng: Buffer | null,
): Promise<(ModelResult & { modelUsed: string }) | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_REEXAMINE_MODEL?.trim() || "gpt-4o";
  const system = reexamineSystemPrompt(input);
  const userText = reexamineUserText(input);

  if (imagePng) {
    const imageDataUrl = `data:image/png;base64,${imagePng.toString("base64")}`;
    const url = `${(process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });
    if (!res.ok) {
      console.error("[reexamine-openai-vision] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = parseModelJson(data.choices[0]?.message.content ?? null);
    return parsed ? { ...parsed, modelUsed: "openai-vision" } : null;
  }

  const content = await callChatCompletions(
    apiKey,
    process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1",
    model,
    system,
    userText,
  );
  const parsed = parseModelJson(content);
  return parsed ? { ...parsed, modelUsed: "openai-text" } : null;
}

async function tryClaudeReexamineWithReason(
  input: ExplanationInput,
  imagePng: Buffer | null,
): Promise<{ result: ModelResult & { modelUsed: string }; reason: null } | { result: null; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { result: null, reason: "ANTHROPIC_API_KEY is not set in environment" };
  }

  const model =
    process.env.ANTHROPIC_REEXAMINE_MODEL?.trim() || "claude-sonnet-4-20250514";
  const system = `${reexamineSystemPrompt(input)}\nRespond with JSON only — no markdown fences.`;
  const userText = reexamineUserText(input);
  const user = imagePng ? anthropicUserWithImage(userText, imagePng) : userText;

  const { text: content, error } = await callAnthropicMessages({
    apiKey,
    model,
    system,
    user,
  });
  if (error) return { result: null, reason: error };

  const parsed = parseModelJson(content);
  if (!parsed) {
    return { result: null, reason: "Claude returned a response that could not be parsed as JSON" };
  }
  return { result: { ...parsed, modelUsed: "claude" }, reason: null };
}

async function arbitrateDisagreement(
  input: ExplanationInput,
  openai: ModelResult,
  claude: ModelResult,
  imagePng: Buffer | null,
): Promise<ModelResult & { modelUsed: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ...openai,
      warnings: [
        ...(openai.warnings ?? []),
        "ChatGPT and Claude disagreed; kept ChatGPT (no arbiter available)",
        `Claude answered: ${formatAnswerSummary(claude)}`,
      ],
      confidence: Math.min(openai.confidence, 0.6),
      modelUsed: "openai-disagreement-fallback",
    };
  }

  const model = process.env.OPENAI_REEXAMINE_MODEL?.trim() || "gpt-4o";
  const system = `You are an expert ${input.subject} tutor resolving a disagreement between two AI solvers.
Carefully re-evaluate the problem and pick the correct answer. Return strict JSON with the same keys as a normal solution plus:
chosenFrom ("chatgpt" | "claude" | "neither"),
correctChoiceLabel, correctAnswerText, explanationShort, explanationStepByStep,
childFriendlyExplanation, commonMistakes, prerequisiteSkills, estimatedTimeSeconds, confidence, warnings.`;

  const userText = [
    "Two AI tutors solved this problem independently and disagree.",
    "",
    `ChatGPT: ${formatAnswerSummary(openai)}`,
    `ChatGPT reasoning: ${openai.explanationStepByStep.slice(0, 2000)}`,
    "",
    `Claude: ${formatAnswerSummary(claude)}`,
    `Claude reasoning: ${claude.explanationStepByStep.slice(0, 2000)}`,
    "",
    "Re-evaluate the problem and return the correct answer with a full explanation.",
    "",
    buildProblemBlock({ ...input, correctChoiceLabel: null, correctAnswerText: null }),
    "",
    "Return strict JSON only.",
  ].join("\n");

  if (imagePng) {
    const imageDataUrl = `data:image/png;base64,${imagePng.toString("base64")}`;
    const url = `${(process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const parsed = parseModelJson(data.choices[0]?.message.content ?? null);
      if (parsed) {
        return {
          ...parsed,
          warnings: [
            ...(parsed.warnings ?? []),
            `Arbitrated disagreement (ChatGPT: ${formatAnswerSummary(openai)}, Claude: ${formatAnswerSummary(claude)})`,
          ],
          modelUsed: "openai-arbitrator",
        };
      }
    }
  } else {
    const content = await callChatCompletions(
      apiKey,
      process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1",
      model,
      system,
      userText,
    );
    const parsed = parseModelJson(content);
    if (parsed) {
      return {
        ...parsed,
        warnings: [
          ...(parsed.warnings ?? []),
          `Arbitrated disagreement (ChatGPT: ${formatAnswerSummary(openai)}, Claude: ${formatAnswerSummary(claude)})`,
        ],
        modelUsed: "openai-arbitrator",
      };
    }
  }

  return {
    ...openai,
    warnings: [
      ...(openai.warnings ?? []),
      "Arbitration failed — kept ChatGPT answer",
      `Claude answered: ${formatAnswerSummary(claude)}`,
    ],
    confidence: Math.min(openai.confidence, 0.55),
    modelUsed: "openai-disagreement-fallback",
  };
}

export async function resolveDualModelReexamineAnswer(
  input: ExplanationInput,
): Promise<DualModelReexamineResult> {
  const imagePng = input.problemImagePath
    ? await loadProblemImagePng(input.problemImagePath)
    : null;

  const [openai, claudeAttempt] = await Promise.all([
    tryOpenAiReexamine(input, imagePng),
    tryClaudeReexamineWithReason(input, imagePng),
  ]);
  const claude = claudeAttempt.result;
  const claudeUnavailableReason = claudeAttempt.reason;

  if (!openai && !claude) {
    throw new Error(
      "Reexamine failed: set OPENAI_API_KEY and ANTHROPIC_API_KEY to run dual-model answer review.",
    );
  }

  if (openai && !claude) {
    return {
      ...openai,
      resolution: "openai-only",
      openaiAnswer: formatAnswerSummary(openai),
      claudeAnswer: null,
      claudeUnavailableReason,
      modelUsed: openai.modelUsed,
    };
  }

  if (!openai && claude) {
    return {
      ...claude,
      resolution: "claude-only",
      openaiAnswer: null,
      claudeAnswer: formatAnswerSummary(claude),
      claudeUnavailableReason: null,
      modelUsed: claude.modelUsed,
    };
  }

  const openaiResult = openai!;
  const claudeResult = claude!;

  if (dualModelAnswersMatch(openaiResult, claudeResult)) {
    return {
      ...openaiResult,
      warnings: [
        ...(openaiResult.warnings ?? []),
        `Claude agreed: ${formatAnswerSummary(claudeResult)}`,
      ],
      confidence: Math.min(0.95, Math.max(openaiResult.confidence, claudeResult.confidence)),
      resolution: "consensus",
      openaiAnswer: formatAnswerSummary(openaiResult),
      claudeAnswer: formatAnswerSummary(claudeResult),
      claudeUnavailableReason: null,
      modelUsed: `${openaiResult.modelUsed}+claude-consensus`,
    };
  }

  const arbitrated = await arbitrateDisagreement(
    input,
    openaiResult,
    claudeResult,
    imagePng,
  );

  return {
    ...arbitrated,
    resolution: "arbitrated",
    openaiAnswer: formatAnswerSummary(openaiResult),
    claudeAnswer: formatAnswerSummary(claudeResult),
    claudeUnavailableReason: null,
    modelUsed: arbitrated.modelUsed,
  };
}
