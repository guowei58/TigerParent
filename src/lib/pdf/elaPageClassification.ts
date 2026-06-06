import {
  callGeminiVision,
  getGeminiVisionConfig,
  getOpenAiVisionConfig,
  isGeminiQuotaExhausted,
  loadProblemImagePng,
} from "@/lib/ai/visionExplanation";

export type ElaPageType =
  | "passage_start"
  | "passage_continue"
  | "question_mcq"
  | "question_open"
  | "answer_key"
  | "other";

export type ElaPageClassification = {
  pageNumber: number;
  type: ElaPageType;
  title: string | null;
  questionRangeStart: number | null;
  questionRangeEnd: number | null;
  /** Question numbers visible on this page (if any). */
  questionNumbers: number[];
  source: "text_heuristic" | "vision";
};

const PASSAGE_INTRO_RE =
  /Read this (?:story|passage|poem|article|text)|Directions[\s\S]{0,80}Read this/i;
const QUESTION_RANGE_RE =
  /answer questions?\s+(\d+)\s+(?:through|and)\s+(\d+)/i;
const SHORT_ANSWER_RE = /\S*\s*is question is worth\s+\d+\s+credits?\./i;
const ANSWER_KEY_PAGE_RE = /^(?:Grade\s+\d+\s+)?(?:ELA\s+)?Answer Key\b/i;
const EXCERPT_TITLE_RE = /Excerpt from\s+(.+?)(?:\s+by\s+|\.\s|$)/i;

function classifyFromText(pageNumber: number, text: string): ElaPageClassification | null {
  const t = text.trim();
  if (!t) return null;

  if (ANSWER_KEY_PAGE_RE.test(t) || /\bAnswer:\s*[A-Dn]/i.test(t.slice(0, 500))) {
    return {
      pageNumber,
      type: "answer_key",
      title: null,
      questionRangeStart: null,
      questionRangeEnd: null,
      questionNumbers: [],
      source: "text_heuristic",
    };
  }

  if (SHORT_ANSWER_RE.test(t) && !/\bA\s+B\s+C\s+D\b/.test(t)) {
    const nums = [...t.matchAll(/\b(\d{1,3})\b/g)]
      .map((m) => parseInt(m[1]!, 10))
      .filter((n) => n >= 1 && n <= 60);
    return {
      pageNumber,
      type: "question_open",
      title: null,
      questionRangeStart: null,
      questionRangeEnd: null,
      questionNumbers: nums.length ? [nums[0]!] : [],
      source: "text_heuristic",
    };
  }

  if (/\bA\s+B\s+C\s+D\b/.test(t) && !PASSAGE_INTRO_RE.test(t)) {
    const lead = t.match(/^\s*(\d{1,3})\b/);
    return {
      pageNumber,
      type: "question_mcq",
      title: null,
      questionRangeStart: null,
      questionRangeEnd: null,
      questionNumbers: lead ? [parseInt(lead[1]!, 10)] : [],
      source: "text_heuristic",
    };
  }

  if (PASSAGE_INTRO_RE.test(t)) {
    const range = t.match(QUESTION_RANGE_RE);
    const excerpt = t.match(EXCERPT_TITLE_RE);
    const book = t.match(/([A-Z][^.\n]{2,50})\s+by\s+[A-Z]/);
    return {
      pageNumber,
      type: "passage_start",
      title: excerpt?.[1]?.trim() ?? book?.[1]?.trim() ?? null,
      questionRangeStart: range ? parseInt(range[1]!, 10) : null,
      questionRangeEnd: range ? parseInt(range[2]!, 10) : null,
      questionNumbers: [],
      source: "text_heuristic",
    };
  }

  if (t.length >= 200 && !/\bA\s+[A-D]\b/.test(t)) {
    return {
      pageNumber,
      type: "passage_continue",
      title: null,
      questionRangeStart: null,
      questionRangeEnd: null,
      questionNumbers: [],
      source: "text_heuristic",
    };
  }

  return null;
}

const PAGE_CLASSIFY_SYSTEM = `You classify ONE page from a New York State Grade 3 ELA released test PDF.
Return strict JSON only with keys:
type (one of: passage_start, passage_continue, question_mcq, question_open, answer_key, other),
title (string or null — passage title if visible),
questionRangeStart (number or null),
questionRangeEnd (number or null),
questionNumbers (array of integers — item numbers visible on this page, e.g. [4,5] if two questions shown).

Rules:
- passage_start: directions like "Read this story/passage" with a question range
- passage_continue: reading passage body only (story/article text, no test question)
- question_mcq: one or more multiple-choice items with A B C D
- question_open: short-response / written response with lined space
- answer_key: answer key table
- other: cover, credits, blank, session divider`;

async function classifyPageWithVision(
  imagePath: string,
  pageNumber: number,
): Promise<ElaPageClassification | null> {
  const png = await loadProblemImagePng(imagePath);
  if (!png) return null;

  const userText = `Classify page ${pageNumber} of the ELA test booklet. Return JSON only.`;

  const gemini = getGeminiVisionConfig();
  if (gemini && !isGeminiQuotaExhausted() && process.env.SKIP_GEMINI_VISION !== "1") {
    const raw = await callGeminiVision(gemini, PAGE_CLASSIFY_SYSTEM, userText, png);
    const parsed = parseVisionClassification(pageNumber, raw);
    if (parsed) return parsed;
  }

  const openai = getOpenAiVisionConfig();
  if (openai && process.env.SKIP_OPENAI_VISION !== "1") {
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    const url = `${openai.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openai.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PAGE_CLASSIFY_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 400,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const parsed = parseVisionClassification(
        pageNumber,
        data.choices[0]?.message.content ?? null,
      );
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseVisionClassification(
  pageNumber: number,
  raw: string | null,
): ElaPageClassification | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as {
      type?: string;
      title?: string | null;
      questionRangeStart?: number | null;
      questionRangeEnd?: number | null;
      questionNumbers?: number[];
    };
    const type = j.type as ElaPageType | undefined;
    if (!type) return null;
    const valid: ElaPageType[] = [
      "passage_start",
      "passage_continue",
      "question_mcq",
      "question_open",
      "answer_key",
      "other",
    ];
    if (!valid.includes(type)) return null;
    return {
      pageNumber,
      type,
      title: j.title?.trim() || null,
      questionRangeStart:
        typeof j.questionRangeStart === "number" ? j.questionRangeStart : null,
      questionRangeEnd:
        typeof j.questionRangeEnd === "number" ? j.questionRangeEnd : null,
      questionNumbers: Array.isArray(j.questionNumbers)
        ? j.questionNumbers.filter((n) => typeof n === "number" && n >= 1 && n <= 99)
        : [],
      source: "vision",
    };
  } catch {
    return null;
  }
}

export async function classifyElaPages(
  pages: { pageNumber: number; text: string }[],
  pageImagePaths: Map<number, string>,
  options?: { useVision?: boolean; maxVisionPages?: number },
): Promise<ElaPageClassification[]> {
  const useVision = options?.useVision !== false;
  const maxVision = options?.maxVisionPages ?? 80;
  const results: ElaPageClassification[] = [];
  let visionUsed = 0;

  for (const page of pages) {
    const fromText = classifyFromText(page.pageNumber, page.text);
    if (fromText) {
      results.push(fromText);
      continue;
    }

    const imagePath = pageImagePaths.get(page.pageNumber);
    if (useVision && imagePath && visionUsed < maxVision) {
      const fromVision = await classifyPageWithVision(imagePath, page.pageNumber);
      visionUsed++;
      if (fromVision) {
        results.push(fromVision);
        continue;
      }
    }

    results.push({
      pageNumber: page.pageNumber,
      type: "other",
      title: null,
      questionRangeStart: null,
      questionRangeEnd: null,
      questionNumbers: [],
      source: "text_heuristic",
    });
  }

  return results;
}
