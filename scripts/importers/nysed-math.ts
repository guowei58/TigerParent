import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { extractPdfText } from "../lib/pdf-text";
import {
  bulkImportProblems,
  loadSkillContext,
  resolveMathSkillId,
} from "../lib/import-helpers";

type NysedMapRow = {
  itemNum: number;
  correctAnswer: string;
  standardCode: string;
  domain: string;
};

function parseNysedMap(text: string): NysedMapRow[] {
  const rows: NysedMapRow[] = [];
  const re =
    /(\d+)\s+Multiple Choice\s+([A-D])\s+\d+\s+NGLS\.Math\.Content\.(NY-[\d.A-Za-z]+)\s+(.+?)\s+[\d.]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    rows.push({
      itemNum: parseInt(m[1], 10),
      correctAnswer: m[2],
      standardCode: m[3],
      domain: m[4].trim(),
    });
  }
  return rows;
}

function findMcqForItem(
  text: string,
  itemNum: number,
): { prompt: string; choices: string[] } | null {
  const re = new RegExp(
    `([\\s\\S]{25,1500}?)\\nA\\s+(.+?)\\nB\\s+(.+?)\\nC\\s+(.+?)\\nD\\s+(.+?)(?:\\n${itemNum}\\n|\\n${itemNum}\\s*\\nPage)`,
    "i",
  );
  const m = text.match(re);
  if (!m) return null;
  const prompt = m[1]
    .replace(/Page \d+/g, "")
    .replace(/GO ON/g, "")
    .replace(/Session \d+/g, "")
    .trim()
    .split("\n")
    .filter((l) => l.trim() && !/^--/.test(l))
    .slice(-8)
    .join("\n")
    .trim();
  if (prompt.length < 15) return null;
  return {
    prompt: prompt.slice(0, 1200),
    choices: [m[2], m[3], m[4], m[5]].map((c) => c.trim().slice(0, 200)),
  };
}

export async function importNysedMath2024(options?: { grades?: number[]; autoApprove?: boolean }) {
  const ctx = await loadSkillContext();
  const grades = options?.grades ?? [3, 4, 5, 6, 7, 8];
  const allItems: ImportItemInput[] = [];

  for (const grade of grades) {
    const path = `data/imports/nysed-2024-math-g${grade}.pdf`;
    console.log(`NYSED G${grade}: parsing...`);
    const text = await extractPdfText(path);
    const mapRows = parseNysedMap(text);
    let extracted = 0;

    for (const row of mapRows) {
      const mcq = findMcqForItem(text, row.itemNum);
      if (!mcq) continue;
      allItems.push({
        sourceQuestionId: `nysed-2024-math-g${grade}-q${row.itemNum}`,
        sourceYear: 2024,
        sourceExam: "NY State Math Test",
        sourceGradeLevel: grade,
        sourceStandardCode: row.standardCode,
        subjectSlug: "math",
        subjectId: ctx.mathSubjectId,
        skillId: resolveMathSkillId(ctx, grade),
        gradeLevel: grade,
        type: "MULTIPLE_CHOICE",
        prompt: mcq.prompt,
        choices: mcq.choices,
        correctAnswer: row.correctAnswer,
        explanation: `NYSED 2024 Grade ${grade} Item ${row.itemNum}. Standard ${row.standardCode} (${row.domain}). Released operational MCQ.`,
        difficulty: 5,
        usageType: "OFFICIAL_RELEASED",
        attributionText: "© New York State Education Department — released test item",
      });
      extracted++;
    }
    console.log(`  map=${mapRows.length} MCQ, extracted=${extracted} with prompts`);
  }

  if (allItems.length === 0) {
    console.warn("NYSED: no items extracted");
    return { imported: 0, skipped: 0, batchId: null };
  }

  return bulkImportProblems("nysed-released", allItems, {
    autoApprove: options?.autoApprove ?? true,
    usageType: "OFFICIAL_RELEASED",
    batchNotes: "NYSED 2024 grades 3-8 math released MCQs",
  });
}
