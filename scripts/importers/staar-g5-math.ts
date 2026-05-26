import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { extractPdfText } from "../lib/pdf-text";
import { bulkImportProblems, loadSkillContext, resolveMathSkillId } from "../lib/import-helpers";

type StaarKeyRow = {
  itemNum: number;
  teks: string;
  correctAnswer: string;
  readiness: string;
};

function parseStaarKeyPdf(text: string): StaarKeyRow[] {
  const rows: StaarKeyRow[] = [];
  const re =
    /(\d+)\s+\d+\s+(Readiness|Supporting)\s+([\d.]+\([A-Z]\))\s+([A-D]|(?:\d+\.?\d*))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    rows.push({
      itemNum: parseInt(m[1], 10),
      readiness: m[2],
      teks: m[3],
      correctAnswer: m[4],
    });
  }
  return rows;
}

function parseStaarMcqItems(text: string): Map<number, { prompt: string; choices: string[] }> {
  const items = new Map<number, { prompt: string; choices: string[] }>();
  const blocks = text.split(/\n(\d{1,2})\s+/);

  for (let i = 1; i < blocks.length; i += 2) {
    const num = parseInt(blocks[i], 10);
    const body = blocks[i + 1] ?? "";
    if (num < 1 || num > 50) continue;

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

export async function importStaarG5Math2019(options?: { autoApprove?: boolean }) {
  const ctx = await loadSkillContext();
  const testPath = "data/staar/2019-staar-5-math-test.pdf";
  const keyPath = "data/staar/2019-staar-5-math-key.pdf";
  const rationalesPath = "data/staar/2019-staar-5-math-rationales.pdf";

  console.log("STAAR G5 Math 2019: parsing...");
  const [testText, keyText, rationalesText] = await Promise.all([
    extractPdfText(testPath),
    extractPdfText(keyPath),
    extractPdfText(rationalesPath).catch(() => ""),
  ]);

  const keys = parseStaarKeyPdf(keyText);
  const tests = parseStaarMcqItems(testText);
  const grade = 5;
  const skillId = resolveMathSkillId(ctx, grade);

  const items: ImportItemInput[] = [];
  for (const k of keys) {
    const test = tests.get(k.itemNum);
    if (!test || !k.correctAnswer.match(/^[A-D]$/)) continue;
    const rationale = extractRationale(rationalesText, k.itemNum);
    items.push({
      sourceQuestionId: `staar-2019-g5-math-q${k.itemNum}`,
      sourceYear: 2019,
      sourceExam: "STAAR",
      sourceGradeLevel: grade,
      sourceStandardCode: k.teks,
      subjectSlug: "math",
      subjectId: ctx.mathSubjectId,
      skillId,
      gradeLevel: grade,
      type: "MULTIPLE_CHOICE",
      prompt: test.prompt,
      choices: test.choices,
      correctAnswer: k.correctAnswer,
      explanation:
        rationale ||
        `TEA STAAR 2019 G5 Math Item ${k.itemNum}. TEKS ${k.teks} (${k.readiness}). Released operational MCQ.`,
      difficulty: k.readiness === "Readiness" ? 6 : 5,
      usageType: "STAAR_PRACTICE",
      attributionText: "© Texas Education Agency — STAAR released item",
    });
  }

  console.log(`  key=${keys.length}, mcq=${tests.size}, matched=${items.length}`);
  if (items.length === 0) return { imported: 0, skipped: 0, batchId: null };

  return bulkImportProblems("tea-staar", items, {
    autoApprove: options?.autoApprove ?? true,
    usageType: "STAAR_PRACTICE",
    batchNotes: "TEA STAAR 2019 Grade 5 Mathematics released MCQs",
  });
}

function extractRationale(text: string, itemNum: number): string {
  if (!text) return "";
  const re = new RegExp(`Item\\s+${itemNum}[\\s\\S]{0,1500}`, "i");
  return text.match(re)?.[0]?.slice(0, 900) ?? "";
}
