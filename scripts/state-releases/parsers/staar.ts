import fs from "fs";
import path from "path";
import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { ReleaseDownloadTarget } from "../catalog";
import { extractPdfText } from "../../lib/pdf-text";
import type { SkillContext } from "../../lib/import-helpers";
import { resolveEnglishSkillId, resolveMathSkillId } from "../../lib/import-helpers";

type StaarKeyRow = {
  itemNum: number;
  teks: string;
  correctAnswer: string;
  readiness: string;
};

function parseStaarKeyPdf(text: string): StaarKeyRow[] {
  const rows: StaarKeyRow[] = [];
  const re =
    /(\d+)\s+\d+\s+(Readiness|Supporting)\s+([\d.]+\([A-Z]\)|[\d.]+\.[A-Z])\s+([A-D]|(?:\d+\.?\d*))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    rows.push({
      itemNum: parseInt(m[1], 10),
      readiness: m[2],
      teks: m[3],
      correctAnswer: m[4],
    });
  }

  // Modern answer-key format: "1. A" or "Item 1 ... Correct Answer: B"
  if (rows.length === 0) {
    const modernRe = /(?:^|\n)(\d{1,2})[\.\)]\s*([A-D])\b/g;
    while ((m = modernRe.exec(text)) !== null) {
      rows.push({
        itemNum: parseInt(m[1], 10),
        teks: "",
        correctAnswer: m[2],
        readiness: "Supporting",
      });
    }
  }

  return rows;
}

function parseStaarMcqItems(text: string): Map<number, { prompt: string; choices: string[] }> {
  const items = new Map<number, { prompt: string; choices: string[] }>();
  const blocks = text.split(/\n(\d{1,2})\s+/);

  for (let i = 1; i < blocks.length; i += 2) {
    const num = parseInt(blocks[i], 10);
    const body = blocks[i + 1] ?? "";
    if (num < 1 || num > 60) continue;

    const fgMatch = body.match(
      /([\s\S]{20,1200}?)\n(?:F|A)\s+(.+?)\n(?:G|B)\s+(.+?)\n(?:H|C)\s+(.+?)\n(?:J|D)\s+(.+?)(?:\nMathematics|\nPage|\n\d+\s+|$)/,
    );
    if (fgMatch) {
      items.set(num, {
        prompt: fgMatch[1].replace(/Mathematics/g, "").trim().slice(0, 1000),
        choices: [fgMatch[2], fgMatch[3], fgMatch[4], fgMatch[5]].map((c) =>
          c.trim().slice(0, 200),
        ),
      });
      continue;
    }

    const abMatch = body.match(
      /([\s\S]{20,1200}?)\nA\s+(.+?)\nB\s+(.+?)\nC\s+(.+?)\nD\s+(.+?)(?:\nMathematics|\nPage|\n\d+\s+|$)/,
    );
    if (abMatch) {
      items.set(num, {
        prompt: abMatch[1].trim().slice(0, 1000),
        choices: [abMatch[2], abMatch[3], abMatch[4], abMatch[5]].map((c) =>
          c.trim().slice(0, 200),
        ),
      });
    }
  }

  return items;
}

function extractRationale(text: string, itemNum: number): string {
  if (!text) return "";
  const re = new RegExp(`(?:Item\\s+)?${itemNum}[\\s\\S]{0,1200}`, "i");
  return text.match(re)?.[0]?.slice(0, 900) ?? "";
}

function findSibling(dir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir).find((f) => pattern.test(f));
  return hit ? path.join(dir, hit) : null;
}

export async function parseStaarRelease(
  target: ReleaseDownloadTarget,
  ctx: SkillContext,
): Promise<ImportItemInput[]> {
  const dir = path.dirname(target.localPath);
  const testPath =
    findSibling(dir, /-test\.pdf$/i) ??
    (target.localPath.includes("-test") ? target.localPath : null);
  const keyPath =
    findSibling(dir, /answer-key|[-_]key\.pdf$/i) ??
    (/-answer-key|[-_]key/i.test(target.localPath) ? target.localPath : null);
  const rationalePath =
    findSibling(dir, /rationale/i) ??
    (target.localPath.includes("rationale") ? target.localPath : null);

  if (!keyPath) return [];

  const keyText = await extractPdfText(keyPath);
  const keys = parseStaarKeyPdf(keyText);
  if (keys.length === 0) return [];

  let testText = "";
  if (testPath && fs.existsSync(testPath)) {
    testText = await extractPdfText(testPath);
  } else if (rationalePath && fs.existsSync(rationalePath)) {
    testText = await extractPdfText(rationalePath);
  }

  let rationalesText = "";
  if (rationalePath && fs.existsSync(rationalePath)) {
    rationalesText = await extractPdfText(rationalePath);
  }

  const tests = parseStaarMcqItems(testText);
  const subjectId =
    target.subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
  const skillId =
    target.subject === "math"
      ? resolveMathSkillId(ctx, target.grade)
      : resolveEnglishSkillId(ctx, target.grade, "Inference");

  const items: ImportItemInput[] = [];
  const seen = new Set<number>();

  for (const k of keys) {
    if (seen.has(k.itemNum)) continue;
    seen.add(k.itemNum);

    const test = tests.get(k.itemNum);
    const rationale = extractRationale(rationalesText, k.itemNum);
    const prompt =
      test?.prompt ??
      (rationale.slice(0, 500) ||
        `TEA STAAR ${target.year} Grade ${target.grade} ${target.subject} released item ${k.itemNum}.`);

    if (!k.correctAnswer.match(/^[A-D]$/)) continue;

    items.push({
      sourceQuestionId: `staar-${target.year}-g${target.grade}-${target.subject}-q${k.itemNum}`,
      sourceYear: target.year,
      sourceExam: "STAAR",
      sourceGradeLevel: target.grade,
      sourceStandardCode: k.teks || undefined,
      subjectSlug: target.subject === "math" ? "math" : "english",
      subjectId,
      skillId,
      gradeLevel: target.grade,
      type: test?.choices?.length ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
      prompt,
      choices: test?.choices,
      correctAnswer: k.correctAnswer,
      explanation:
        rationale ||
        `TEA STAAR ${target.year} G${target.grade} ${target.subject} Item ${k.itemNum}. TEKS ${k.teks} (${k.readiness}). Released operational item.`,
      difficulty: k.readiness === "Readiness" ? 6 : 5,
      usageType: "OFFICIAL_RELEASED",
      attributionText: "© Texas Education Agency — STAAR released item",
    });
  }

  return items;
}

/** Dedupe STAAR imports — only parse once per grade/year/subject folder. */
export function staarParseKey(target: ReleaseDownloadTarget): string | null {
  if (target.sourceId !== "tea-staar") return null;
  const fname = path.basename(target.localPath);
  if (/-answer-key|[-_]key/i.test(fname)) {
    return `${target.year}-${target.grade}-${target.subject}`;
  }
  if (/-test\.pdf$/i.test(fname)) {
    return `${target.year}-${target.grade}-${target.subject}`;
  }
  return null;
}

export function shouldSkipStaarDuplicate(
  target: ReleaseDownloadTarget,
  parsed: Set<string>,
): boolean {
  const key = staarParseKey(target);
  if (!key) return false;
  if (parsed.has(key)) return true;
  parsed.add(key);
  return false;
}
