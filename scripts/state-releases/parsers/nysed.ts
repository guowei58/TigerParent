import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { ReleaseDownloadTarget } from "../catalog";
import { extractPdfText } from "../../lib/pdf-text";
import type { SkillContext } from "../../lib/import-helpers";
import { resolveEnglishSkillId, resolveMathSkillId } from "../../lib/import-helpers";
import {
  extractMcqBlocks,
  matchMapToBlocks,
  parseNysedMap,
} from "./shared";

export async function parseNysedPdf(
  target: ReleaseDownloadTarget,
  ctx: SkillContext,
): Promise<ImportItemInput[]> {
  const text = await extractPdfText(target.localPath);
  const mapRows = parseNysedMap(text, target.subject);
  const blocks = extractMcqBlocks(text);
  const matched = matchMapToBlocks(mapRows, blocks);
  const items: ImportItemInput[] = [];

  const subjectId =
    target.subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
  const skillId =
    target.subject === "math"
      ? resolveMathSkillId(ctx, target.grade)
      : resolveEnglishSkillId(ctx, target.grade, "Main Idea");

  for (const row of mapRows) {
    const block = matched.get(row.itemNum);
    const prompt =
      block?.prompt ??
      `${target.stateName} Grade ${target.grade} ${target.subject.toUpperCase()} released item #${row.itemNum} (${row.domain}). See source PDF for full stimulus.`;

    items.push({
      sourceQuestionId: `nysed-${target.year}-${target.subject}-g${target.grade}-q${row.itemNum}`,
      sourceYear: target.year,
      sourceExam: `NY ${target.subject === "math" ? "Math" : "ELA"} Test`,
      sourceGradeLevel: target.grade,
      sourceStandardCode: row.standardCode,
      subjectSlug: target.subject === "math" ? "math" : "english",
      subjectId,
      skillId,
      gradeLevel: target.grade,
      type: block?.choices?.length ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
      prompt,
      choices: block?.choices,
      correctAnswer: row.correctAnswer,
      explanation: `NYSED ${target.year} Grade ${target.grade} Item ${row.itemNum}. Standard: ${row.standardCode}. Domain: ${row.domain}. Official released ${target.subject} assessment item.`,
      difficulty: 5,
      usageType: "OFFICIAL_RELEASED",
      attributionText: "© New York State Education Department — released test item",
    });
  }

  return items;
}
