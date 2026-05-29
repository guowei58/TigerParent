import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { ReleaseDownloadTarget } from "../catalog";
import { extractPdfText } from "../../lib/pdf-text";
import type { SkillContext } from "../../lib/import-helpers";
import { resolveEnglishSkillId, resolveMathSkillId } from "../../lib/import-helpers";
import { extractMcqBlocks, extractMcqBlocksDotFormat, parseMcasReleasedTable, parseNysedMap } from "./shared";

/**
 * Best-effort parser for unknown state release PDFs.
 * Tries MCAS table, NYSED map, then MCQ blocks.
 */
export async function parseGenericReleasedPdf(
  target: ReleaseDownloadTarget,
  ctx: SkillContext,
): Promise<ImportItemInput[]> {
  const text = await extractPdfText(target.localPath);
  const subjectId =
    target.subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
  const skillId =
    target.subject === "math"
      ? resolveMathSkillId(ctx, target.grade)
      : resolveEnglishSkillId(ctx, target.grade, "Main Idea");

  let rows = parseMcasReleasedTable(text).map((r) => ({
    itemNum: r.itemNum,
    correctAnswer: r.correctAnswer,
    prompt: r.description ?? "",
    standardCode: r.standardCode,
  }));

  if (rows.length === 0) {
    const nysed = parseNysedMap(text, target.subject);
    rows = nysed.map((r) => ({
      itemNum: r.itemNum,
      correctAnswer: r.correctAnswer,
      prompt: r.domain,
      standardCode: r.standardCode,
    }));
  }

  const blocks = (() => {
    const standard = extractMcqBlocks(text);
    if (standard.length >= 3) return standard;
    const dotted = extractMcqBlocksDotFormat(text);
    return dotted.length > standard.length ? dotted : standard;
  })();
  const items: ImportItemInput[] = [];

  if (rows.length > 0) {
    for (const row of rows) {
      const block = blocks[row.itemNum - 1];
      items.push({
        sourceQuestionId: `${target.stateCode.toLowerCase()}-${target.sourceId}-${target.year}-g${target.grade}-${target.subject}-q${row.itemNum}`,
        sourceYear: target.year,
        sourceExam: target.stateCode,
        sourceGradeLevel: target.grade,
        sourceStandardCode: row.standardCode,
        subjectSlug: target.subject === "math" ? "math" : "english",
        subjectId,
        skillId,
        gradeLevel: target.grade,
        type: block?.choices?.length ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
        prompt: (block?.prompt ?? row.prompt).slice(0, 1500),
        choices: block?.choices,
        correctAnswer: row.correctAnswer,
        explanation: `${target.stateName} ${target.year} Grade ${target.grade} released item ${row.itemNum}.`,
        difficulty: 5,
        usageType: "OFFICIAL_RELEASED",
        attributionText: `© ${target.stateName} — released assessment item`,
      });
    }
    return items;
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    items.push({
      sourceQuestionId: `${target.stateCode.toLowerCase()}-${target.year}-g${target.grade}-${target.subject}-mcq${i + 1}`,
      sourceYear: target.year,
      sourceExam: target.stateCode,
      sourceGradeLevel: target.grade,
      subjectSlug: target.subject === "math" ? "math" : "english",
      subjectId,
      skillId,
      gradeLevel: target.grade,
      type: "MULTIPLE_CHOICE",
      prompt: block.prompt.slice(0, 1500),
      choices: block.choices,
      correctAnswer: "See official key",
      explanation: `${target.stateName} released practice item (see source PDF for key).`,
      difficulty: 5,
      usageType: "OFFICIAL_RELEASED",
      attributionText: `© ${target.stateName} — released assessment item`,
    });
  }

  return items;
}
