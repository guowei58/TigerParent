import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { ReleaseDownloadTarget } from "../catalog";
import { extractPdfText } from "../../lib/pdf-text";
import type { SkillContext } from "../../lib/import-helpers";
import { resolveEnglishSkillId, resolveMathSkillId } from "../../lib/import-helpers";
import { extractMcqBlocks, matchMapToBlocks, parseMcasReleasedTable } from "./shared";

export async function parseMcasPdf(
  target: ReleaseDownloadTarget,
  ctx: SkillContext,
): Promise<ImportItemInput[]> {
  const text = await extractPdfText(target.localPath);
  const mapRows = parseMcasReleasedTable(text);
  if (mapRows.length === 0) return [];

  const blocks = extractMcqBlocks(text);
  const matched = matchMapToBlocks(mapRows, blocks);
  const items: ImportItemInput[] = [];

  const subjectId =
    target.subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
  const skillId =
    target.subject === "math"
      ? resolveMathSkillId(ctx, target.grade)
      : resolveEnglishSkillId(ctx, target.grade, "Inference");

  for (const row of mapRows) {
    const block = matched.get(row.itemNum);
    const prompt = block?.prompt ?? row.description ?? `MCAS released item ${row.itemNum}`;

    items.push({
      sourceQuestionId: `mcas-${target.year}-${target.subject}-g${target.grade}-q${row.itemNum}`,
      sourceYear: target.year,
      sourceExam: "MCAS",
      sourceGradeLevel: target.grade,
      sourceStandardCode: row.standardCode,
      subjectSlug: target.subject === "math" ? "math" : "english",
      subjectId,
      skillId,
      gradeLevel: target.grade,
      type: "MULTIPLE_CHOICE",
      prompt: prompt.slice(0, 1500),
      choices: block?.choices,
      correctAnswer: row.correctAnswer.replace(/;.*/, ""),
      explanation: `Massachusetts MCAS ${target.year} Grade ${target.grade} Item ${row.itemNum}. Standard ${row.standardCode}. ${row.description ?? ""}`.trim(),
      difficulty: 5,
      usageType: "OFFICIAL_RELEASED",
      attributionText: "© Massachusetts Department of Elementary and Secondary Education — released item",
    });
  }

  return items;
}
