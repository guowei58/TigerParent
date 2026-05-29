import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { ReleaseDownloadTarget } from "../catalog";
import { extractPdfText } from "../../lib/pdf-text";
import type { SkillContext } from "../../lib/import-helpers";
import { resolveEnglishSkillId, resolveMathSkillId } from "../../lib/import-helpers";
import { extractMcqBlocks } from "./shared";

/** Parse VA SOL released test PDFs (2014–2015 full-booklet format). */
export async function parseVaSolPdf(
  target: ReleaseDownloadTarget,
  ctx: SkillContext,
): Promise<ImportItemInput[]> {
  const text = await extractPdfText(target.localPath);
  const blocks = extractMcqBlocks(text);
  const items: ImportItemInput[] = [];

  const subjectId =
    target.subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
  const skillId =
    target.subject === "math"
      ? resolveMathSkillId(ctx, target.grade)
      : resolveEnglishSkillId(ctx, target.grade, "Main Idea");

  // Item numbers from "1 " blocks or sequential MCQ
  const numbered = parseVaNumberedItems(text);

  if (blocks.length > 0) {
    for (let i = 0; i < blocks.length; i++) {
      const num = numbered[i]?.itemNum ?? i + 1;
      const block = blocks[i];
      items.push({
        sourceQuestionId: `va-sol-${target.year}-g${target.grade}-${target.subject}-q${num}`,
        sourceYear: target.year,
        sourceExam: "Virginia SOL",
        sourceGradeLevel: target.grade,
        subjectSlug: target.subject === "math" ? "math" : "english",
        subjectId,
        skillId,
        gradeLevel: target.grade,
        type: "MULTIPLE_CHOICE",
        prompt: block.prompt.slice(0, 1500),
        choices: block.choices,
        correctAnswer: numbered[i]?.answer ?? "A",
        explanation: `Virginia SOL ${target.year} Grade ${target.grade} ${target.subject} released item ${num}.`,
        difficulty: 5,
        usageType: "OFFICIAL_RELEASED",
        attributionText: "© Virginia Department of Education — SOL released test item",
      });
    }
    return items;
  }

  // Metadata-only rows from answer key lines
  for (const row of numbered) {
    if (!row.answer?.match(/^[A-D]$/)) continue;
    items.push({
      sourceQuestionId: `va-sol-${target.year}-g${target.grade}-${target.subject}-q${row.itemNum}`,
      sourceYear: target.year,
      sourceExam: "Virginia SOL",
      sourceGradeLevel: target.grade,
      subjectSlug: target.subject === "math" ? "math" : "english",
      subjectId,
      skillId,
      gradeLevel: target.grade,
      type: "MULTIPLE_CHOICE",
      prompt: `Virginia SOL ${target.year} Grade ${target.grade} ${target.subject} released item ${row.itemNum}. See source PDF.`,
      correctAnswer: row.answer,
      explanation: `Virginia SOL ${target.year} released item ${row.itemNum}.`,
      difficulty: 5,
      usageType: "OFFICIAL_RELEASED",
      attributionText: "© Virginia Department of Education — SOL released test item",
    });
  }

  return items;
}

function parseVaNumberedItems(
  text: string,
): Array<{ itemNum: number; answer: string }> {
  const rows: Array<{ itemNum: number; answer: string }> = [];
  const re = /(?:^|\n)(\d{1,2})[\.\)]\s+([A-D])\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 60) rows.push({ itemNum: num, answer: m[2] });
  }
  const seen = new Set<number>();
  return rows.filter((r) => {
    if (seen.has(r.itemNum)) return false;
    seen.add(r.itemNum);
    return true;
  });
}
