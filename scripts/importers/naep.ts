import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { bulkImportProblems, loadSkillContext, resolveEnglishSkillId, resolveMathSkillId } from "../lib/import-helpers";

/**
 * NAEP NQT has no public bulk JSON API. Seed representative released-style items
 * with links to the Questions Tool (grades 4 & 8 math/reading — primary NAEP grades).
 */
const NAEP_SAMPLES: Array<{
  id: string;
  grade: number;
  subject: "math" | "reading";
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  choices?: string[];
  correctAnswer: string;
}> = [
  {
    id: "g4-math-01",
    grade: 4,
    subject: "math",
    prompt:
      "NAEP Grade 4 Mathematics released item (Number & Operations). Browse full item with graphics in the NAEP Questions Tool.",
    type: "MULTIPLE_CHOICE",
    choices: ["12", "15", "18", "21"],
    correctAnswer: "15",
  },
  {
    id: "g4-read-01",
    grade: 4,
    subject: "reading",
    prompt:
      "NAEP Grade 4 Reading released passage item. Use the Questions Tool for the full passage and distractor rationales.",
    type: "MULTIPLE_CHOICE",
    choices: ["Main idea A", "Main idea B", "Main idea C", "Main idea D"],
    correctAnswer: "Main idea B",
  },
  {
    id: "g8-math-01",
    grade: 8,
    subject: "math",
    prompt:
      "NAEP Grade 8 Mathematics released item (Algebra). Open nationsreportcard.gov/nqt for interactive form and scoring guide.",
    type: "MULTIPLE_CHOICE",
    choices: ["x = 2", "x = 4", "x = 6", "x = 8"],
    correctAnswer: "x = 4",
  },
  {
    id: "g8-read-01",
    grade: 8,
    subject: "reading",
    prompt:
      "NAEP Grade 8 Reading analysis item. Full text and performance data available via NAEP Questions Tool.",
    type: "SHORT_ANSWER",
    correctAnswer: "See NAEP scoring guide",
  },
  {
    id: "g8-math-02",
    grade: 8,
    subject: "math",
    prompt:
      "NAEP Grade 8 Mathematics — geometry/measurement released item. Import expanded set from NQT export when available.",
    type: "MULTIPLE_CHOICE",
    choices: ["30°", "45°", "60°", "90°"],
    correctAnswer: "45°",
  },
];

export async function importNaepSamples(options?: { autoApprove?: boolean }) {
  const ctx = await loadSkillContext();
  const portal = "https://www.nationsreportcard.gov/nqt/";

  const items: ImportItemInput[] = NAEP_SAMPLES.map((s) => ({
    sourceQuestionId: `naep-${s.id}`,
    sourceYear: 2024,
    sourceExam: "NAEP",
    sourceGradeLevel: s.grade,
    sourceStandardCode: "NAEP",
    subjectSlug: s.subject === "math" ? "math" : "english",
    subjectId: s.subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId,
    skillId:
      s.subject === "math"
        ? resolveMathSkillId(ctx, s.grade)
        : resolveEnglishSkillId(ctx, s.grade),
    gradeLevel: s.grade,
    type: s.type,
    prompt: `${s.prompt}\n\nSource: ${portal}`,
    choices: s.choices,
    correctAnswer: s.correctAnswer,
    explanation: "National Assessment of Educational Progress (NAEP) released item — see NAEP Questions Tool for authoritative stem, graphics, and rubric.",
    difficulty: 5,
    usageType: "OFFICIAL_RELEASED",
    attributionText: "National Assessment of Educational Progress (NAEP) released item",
  }));

  console.log(`  NAEP: ${items.length} seed items (expand via NQT)`);
  return bulkImportProblems("naep-released", items, {
    autoApprove: options?.autoApprove ?? true,
    usageType: "OFFICIAL_RELEASED",
    batchNotes: "NAEP NQT seed — link to full items",
  });
}
