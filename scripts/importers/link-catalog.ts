import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";
import type { SourceRegistryEntry } from "@/lib/content-provenance/source-registry";
import { bulkImportProblems, loadSkillContext, resolveEnglishSkillId, resolveMathSkillId } from "../lib/import-helpers";

const LINK_STATUSES = new Set(["LINK_ONLY", "PRIVATE_UPLOAD_ONLY"]);

function buildLinkItems(
  source: SourceRegistryEntry,
  ctx: Awaited<ReturnType<typeof loadSkillContext>>,
): ImportItemInput[] {
  const grades = [3, 4, 5, 6, 7, 8];
  const items: ImportItemInput[] = [];
  const isEla =
    /read|ela|literacy|commonlit|readworks|ckla|ambleside|el education/i.test(source.name);
  const isMath =
    /math|gsm8k|webwork|openstax|illustrative|engageny|staar|phet|zearn|mammoth|saxon|aops|ixl/i.test(
      source.name,
    );
  const subjects: Array<"math" | "english"> =
    isEla && !isMath ? ["english"] : isMath && !isEla ? ["math"] : ["math", "english"];

  for (const grade of grades) {
    for (const subj of subjects) {
      const subjectId = subj === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
      const skillId =
        subj === "math"
          ? resolveMathSkillId(ctx, grade)
          : resolveEnglishSkillId(ctx, grade, "Main Idea");
      items.push({
        sourceQuestionId: `${source.id}-g${grade}-${subj}-catalog`,
        sourceYear: 2025,
        sourceExam: source.shortName,
        sourceGradeLevel: grade,
        subjectSlug: subj === "math" ? "math" : "english",
        subjectId,
        skillId,
        gradeLevel: grade,
        type: "SHORT_ANSWER",
        prompt: `${source.name} — Grade ${grade} ${subj === "math" ? "Mathematics" : "ELA"} practice. Open the official source to work items: ${source.url ?? "see publisher site"}`,
        correctAnswer: "Complete on official site",
        explanation: `${source.notes ?? ""} Track progress in TigerParent; full item text lives at the publisher when import is not licensed.`,
        difficulty: 5,
        usageType: source.sourceType === "OFFICIAL_LINKED" ? "OFFICIAL_STYLE" : "CONCEPT_PRACTICE",
        attributionText: source.attributionText ?? `© ${source.publisher ?? source.name}`,
      });
    }
  }
  return items;
}

export async function importLinkCatalog(options?: {
  sourceIds?: string[];
  autoApprove?: boolean;
}) {
  const ctx = await loadSkillContext();
  const targets = SOURCE_REGISTRY.filter(
    (s) =>
      LINK_STATUSES.has(s.importStatus) &&
      s.id !== "tigerparent-generated" &&
      s.id !== "parent-private-upload" &&
      (!options?.sourceIds?.length || options.sourceIds.includes(s.id)),
  );

  const results: Record<string, { imported: number; skipped: number }> = {};

  for (const source of targets) {
    const items = buildLinkItems(source, ctx);
    const r = await bulkImportProblems(source.id, items, {
      autoApprove: options?.autoApprove ?? true,
      usageType: items[0]?.usageType,
      batchNotes: `Link catalog ${source.id}`,
    });
    results[source.id] = { imported: r.imported, skipped: r.skipped };
    if (r.imported > 0) {
      console.log(`  ${source.shortName}: +${r.imported} catalog links`);
    }
  }

  return results;
}
