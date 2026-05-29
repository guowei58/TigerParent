import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { stripHtml } from "./shared-html";
import { bulkImportProblems, loadSkillContext, resolveMathSkillId } from "../lib/import-helpers";

const API = "https://exercises.openstax.org/api/exercises";
const K12_MATH_BOOKS = [
  { slug: "prealgebra-2e", grade: 7, label: "Prealgebra 2e" },
  { slug: "elementary-algebra-2e", grade: 8, label: "Elementary Algebra 2e" },
  { slug: "algebra-1", grade: 9, label: "Algebra 1" },
  { slug: "algebra-2e", grade: 10, label: "Algebra 2e" },
  { slug: "geometry-2e", grade: 9, label: "Geometry 2e" },
  { slug: "precalculus-2e", grade: 11, label: "Precalculus 2e" },
  { slug: "calculus-volume-1", grade: 12, label: "Calculus Vol 1" },
];

type OsExercise = {
  uuid: string;
  uid: string;
  questions?: Array<{
    stem_html?: string;
    formats?: string[];
    answers?: Array<{ content_html?: string }>;
  }>;
};

async function fetchPage(search: string, page: number): Promise<OsExercise[]> {
  const url = `${API}?search=${encodeURIComponent(search)}&page=${page}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: OsExercise[] };
  return data.items ?? [];
}

function toImportItem(
  ex: OsExercise,
  book: (typeof K12_MATH_BOOKS)[number],
  ctx: Awaited<ReturnType<typeof loadSkillContext>>,
): ImportItemInput | null {
  const q = ex.questions?.[0];
  if (!q?.stem_html) return null;
  const prompt = stripHtml(q.stem_html).slice(0, 2000);
  if (prompt.length < 20) return null;

  const isMcq = q.formats?.includes("multiple-choice") && (q.answers?.length ?? 0) >= 2;
  const choices = isMcq
    ? q.answers!.slice(0, 6).map((a) => stripHtml(a.content_html ?? "").slice(0, 500))
    : undefined;

  const grade = Math.min(12, Math.max(6, book.grade));

  return {
    sourceQuestionId: `openstax-${ex.uuid}`,
    sourceYear: 2024,
    sourceExam: book.label,
    sourceGradeLevel: grade,
    subjectSlug: "math",
    subjectId: ctx.mathSubjectId,
    skillId: resolveMathSkillId(ctx, grade),
    gradeLevel: grade,
    type: isMcq ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
    prompt,
    choices,
    correctAnswer: isMcq ? "A" : "See OpenStax solution",
    explanation: `OpenStax ${book.label} exercise ${ex.uid}. Full solution at https://openstax.org/ — CC BY 4.0.`,
    difficulty: 5,
    usageType: "CONCEPT_PRACTICE",
    attributionText: "© OpenStax — CC BY 4.0",
  };
}

export async function importOpenStaxExercises(options?: {
  pagesPerBook?: number;
  autoApprove?: boolean;
}) {
  const pages = options?.pagesPerBook ?? 3;
  const ctx = await loadSkillContext();
  const allItems: ImportItemInput[] = [];

  for (const book of K12_MATH_BOOKS) {
    const search = `book-slug:${book.slug}`;
    console.log(`  OpenStax ${book.label}...`);
    for (let page = 1; page <= pages; page++) {
      const batch = await fetchPage(search, page);
      if (batch.length === 0) break;
      for (const ex of batch) {
        const item = toImportItem(ex, book, ctx);
        if (item) allItems.push(item);
      }
    }
  }

  const seen = new Set<string>();
  const deduped = allItems.filter((i) => {
    if (!i.sourceQuestionId || seen.has(i.sourceQuestionId)) return false;
    seen.add(i.sourceQuestionId);
    return true;
  });

  console.log(`  OpenStax: ${deduped.length} exercises parsed`);
  return bulkImportProblems("openstax", deduped, {
    autoApprove: options?.autoApprove ?? true,
    usageType: "CONCEPT_PRACTICE",
    batchNotes: "OpenStax Exercises API — CC BY 4.0",
  });
}
