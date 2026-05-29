import fs from "fs";
import sharp from "sharp";
import { resolveDataPath } from "@/lib/storage/fileStorage";
import type { ExplanationInput, ExplanationOutput } from "@/lib/ai/generateProblemExplanation";
import {
  buildProblemBlock,
  buildTextExplanationSystemPrompt,
  buildVisionExplanationSystemPrompt,
} from "@/lib/ai/explanationPrompts";
import { callChatCompletions } from "@/lib/ai/chatCompletions";
import { normalizeExplanation } from "@/lib/ai/explanationNormalize";
import { normalizeExplanationText } from "@/lib/pdf/formatExplanation";

export type VisionExplanationConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function getOpenAiVisionConfig(): VisionExplanationConfig | null {
  const apiKey =
    process.env.EXPLANATION_VISION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl:
      process.env.EXPLANATION_VISION_BASE_URL?.trim() ||
      process.env.OPENAI_API_BASE?.trim() ||
      "https://api.openai.com/v1",
    model:
      process.env.EXPLANATION_VISION_MODEL?.trim() ||
      process.env.OPENAI_VISION_MODEL?.trim() ||
      "gpt-4o-mini",
  };
}

export function getGeminiVisionConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.GEMINI_VISION_MODEL?.trim() || "gemini-2.0-flash",
  };
}

export function hasVisionExplanationProvider(): boolean {
  return Boolean(getOpenAiVisionConfig() || getGeminiVisionConfig());
}

export async function loadProblemImagePng(storedPath: string): Promise<Buffer | null> {
  const abs = resolveDataPath(storedPath);
  if (!fs.existsSync(abs)) return null;

  return sharp(abs)
    .rotate()
    .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

function normalizeVisionExplanation(parsed: ExplanationOutput): ExplanationOutput {
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
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
  };
}

/** Step 1: DeepSeek text-only draft (cheap first pass). */
export async function tryDeepseekTextExplanation(
  input: ExplanationInput,
): Promise<(ExplanationOutput & { modelUsed: string }) | null> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!deepseekKey) return null;

  const content = await callChatCompletions(
    deepseekKey,
    process.env.DEEPSEEK_API_BASE ?? "https://api.deepseek.com/v1",
    process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    buildTextExplanationSystemPrompt(input),
    `Solve this problem and explain it thoroughly:\n\n${buildProblemBlock(input)}`,
  );
  if (!content) return null;

  try {
    const parsed = normalizeExplanation(JSON.parse(content) as ExplanationOutput);
    parsed.warnings = [...(parsed.warnings ?? []), "DeepSeek draft from PDF text (may be incomplete)"];
    return { ...parsed, modelUsed: "deepseek-draft" };
  } catch {
    return null;
  }
}

function buildVisionUserText(
  input: ExplanationInput,
  deepseekDraft: (ExplanationOutput & { modelUsed: string }) | null,
): string {
  const lines = [
    "The attached image is a test problem (full page crop). Read the question, any diagram, and all answer choices from the image.",
    `Grade level: ${input.gradeLevel}. Subject: ${input.subject}.`,
  ];
  if (input.conceptName) lines.push(`Topic hint: ${input.conceptName}.`);
  if (input.correctChoiceLabel) {
    lines.push(
      `Official answer key: choice ${input.correctChoiceLabel}. Your final explanation MUST support ${input.correctChoiceLabel} and must not argue for a different letter.`,
    );
  } else if (input.correctAnswerText) {
    lines.push(`Official answer key: ${input.correctAnswerText}.`);
  } else {
    lines.push("No official answer key — solve the problem from the image.");
  }

  if (deepseekDraft) {
    lines.push(
      "",
      "A cheaper AI (DeepSeek) already attempted this using broken PDF text only. Review and correct that draft using the image.",
      `DeepSeek short answer: ${deepseekDraft.explanationShort}`,
      `DeepSeek steps: ${deepseekDraft.explanationStepByStep.slice(0, 1500)}`,
      "Use the image as the source of truth. Replace wrong steps. Your output is the final explanation students will see.",
    );
  }

  const excerpt = input.cleanedText.trim().slice(0, 400);
  if (excerpt) {
    lines.push("", "Noisy PDF text excerpt (unreliable):", excerpt);
  }
  lines.push("", "Return strict JSON only with the required keys.");
  return lines.join("\n");
}

function parseRetryAfterMs(res: Response, body: string): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const sec = Number(header);
    if (Number.isFinite(sec) && sec > 0) return sec * 1000;
  }
  const match = body.match(/try again in (\d+)ms/i);
  if (match) return Number(match[1]!) + 200;
  return 2000;
}

async function callVisionChat(
  config: VisionExplanationConfig,
  system: string,
  userText: string,
  imageDataUrl: string,
): Promise<string | null> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = JSON.stringify({
    model: config.model,
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
    max_tokens: 2048,
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (res.ok) {
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message.content ?? null;
    }

    const errBody = await res.text().catch(() => "");
    if (res.status === 429 && attempt < 4) {
      const waitMs = parseRetryAfterMs(res, errBody);
      console.error(`[vision-openai] rate limited, retry in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    console.error("[vision-openai] HTTP", res.status, errBody.slice(0, 300));
    return null;
  }

  return null;
}

async function callGeminiVision(
  config: { apiKey: string; model: string },
  system: string,
  userText: string,
  imagePng: Buffer,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            { inlineData: { mimeType: "image/png", data: imagePng.toString("base64") } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const short =
      errBody.length > 200 ? `${errBody.slice(0, 200)}…` : errBody;
    console.error("[vision-gemini] HTTP", res.status, short);
    return null;
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

/**
 * Step 2–3: Gemini vision (preferred), then OpenAI vision. Both may review the DeepSeek draft.
 */
export async function generateExplanationFromProblemImage(
  input: ExplanationInput,
  imageStoredPath: string,
  deepseekDraft: (ExplanationOutput & { modelUsed: string }) | null,
): Promise<(ExplanationOutput & { modelUsed: string }) | null> {
  const imagePng = await loadProblemImagePng(imageStoredPath);
  if (!imagePng) return null;

  const imageDataUrl = `data:image/png;base64,${imagePng.toString("base64")}`;
  const systemPrompt = buildVisionExplanationSystemPrompt(input);
  const userText = buildVisionUserText(input, deepseekDraft);

  const geminiBase = getGeminiVisionConfig();
  if (geminiBase) {
    const models = [geminiBase.model, "gemini-2.0-flash-lite"].filter(
      (m, i, a) => a.indexOf(m) === i,
    );

    for (const model of models) {
      const content = await callGeminiVision(
        { ...geminiBase, model },
        systemPrompt,
        userText,
        imagePng,
      );
      if (content) {
        try {
          const parsed = normalizeVisionExplanation(JSON.parse(content) as ExplanationOutput);
          parsed.warnings = [
            ...(parsed.warnings ?? []),
            deepseekDraft ? "Reviewed DeepSeek draft against image" : "Generated from image",
          ];
          return { ...parsed, modelUsed: `gemini:${model}` };
        } catch (e) {
          console.error("[vision-gemini] JSON parse failed", e);
        }
      }
    }
  }

  const openAiConfig = getOpenAiVisionConfig();
  if (openAiConfig) {
    const content = await callVisionChat(openAiConfig, systemPrompt, userText, imageDataUrl);
    if (content) {
      try {
        const parsed = normalizeVisionExplanation(JSON.parse(content) as ExplanationOutput);
        parsed.warnings = [
          ...(parsed.warnings ?? []),
          "OpenAI vision fallback",
          ...(deepseekDraft ? ["Reviewed DeepSeek draft against image"] : []),
        ];
        return { ...parsed, modelUsed: `openai-vision:${openAiConfig.model}` };
      } catch (e) {
        console.error("[vision-openai] JSON parse failed", e);
      }
    }
  }

  return null;
}
