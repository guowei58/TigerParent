import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { bulkImportProblems, loadSkillContext, resolveMathSkillId } from "../lib/import-helpers";

/** Curated OER practice stems (CC-licensed curricula) until full module import exists. */
const CURRICULUM_SAMPLES: Record<
  string,
  { sourceId: string; exam: string; url: string; items: Array<{ grade: number; prompt: string }> }
> = {
  "illustrative-math": {
    sourceId: "illustrative-math",
    exam: "Illustrative Mathematics",
    url: "https://im.kendallhunt.com/",
    items: [
      { grade: 6, prompt: "Grade 6 Unit 3 — ratio reasoning: equivalent ratios in a table." },
      { grade: 7, prompt: "Grade 7 Unit 4 — proportional relationships in graphs and equations." },
      { grade: 8, prompt: "Grade 8 Unit 5 — systems of linear equations (graphing method)." },
    ],
  },
  engageny: {
    sourceId: "engageny",
    exam: "EngageNY / Eureka Math",
    url: "https://greatminds.org/math",
    items: [
      { grade: 3, prompt: "Grade 3 Module 1 — multiplication and division word problems." },
      { grade: 4, prompt: "Grade 4 Module 3 — multi-digit multiplication and division." },
      { grade: 5, prompt: "Grade 5 Module 4 — multiplication and division of fractions." },
    ],
  },
};

export async function importOerCurriculumSamples(options?: { autoApprove?: boolean }) {
  const ctx = await loadSkillContext();
  const results: Record<string, { imported: number; skipped: number }> = {};

  for (const spec of Object.values(CURRICULUM_SAMPLES)) {
    const items: ImportItemInput[] = spec.items.map((s, i) => ({
      sourceQuestionId: `${spec.sourceId}-g${s.grade}-sample-${i + 1}`,
      sourceYear: 2024,
      sourceExam: spec.exam,
      sourceGradeLevel: s.grade,
      subjectSlug: "math",
      subjectId: ctx.mathSubjectId,
      skillId: resolveMathSkillId(ctx, s.grade),
      gradeLevel: s.grade,
      type: "SHORT_ANSWER",
      prompt: `${s.prompt} Curriculum: ${spec.url}`,
      correctAnswer: "See teacher edition / solutions",
      explanation: `${spec.exam} — CC-licensed curriculum sample. Full problem sets on publisher site.`,
      difficulty: 5,
      usageType: "CONCEPT_PRACTICE",
      attributionText: `© ${spec.exam} — CC licensed curriculum`,
    }));

    results[spec.sourceId] = await bulkImportProblems(spec.sourceId, items, {
      autoApprove: options?.autoApprove ?? true,
      usageType: "CONCEPT_PRACTICE",
      batchNotes: `OER curriculum samples ${spec.sourceId}`,
    });
    console.log(`  ${spec.exam}: +${results[spec.sourceId].imported}`);
  }

  return results;
}
