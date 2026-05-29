import { prisma } from "@/lib/db";
import {
  getDoneCountByConceptAndGrade,
  type ProgressScope,
} from "@/lib/pdf-practice/progress";

export async function selectApprovedPdfProblems(options: {
  conceptSlug?: string;
  conceptId?: string;
  gradeLevel?: number;
  limit?: number;
  excludeIds?: string[];
}) {
  const { conceptSlug, conceptId, gradeLevel, limit = 10, excludeIds = [] } = options;

  const conceptFilter = conceptId
    ? { primaryConceptId: conceptId }
    : conceptSlug
      ? { primaryConcept: { slug: conceptSlug } }
      : {};

  return prisma.pdfPracticeProblem.findMany({
    where: {
      approvedForStudentUse: true,
      reviewStatus: "approved",
      id: excludeIds.length ? { notIn: excludeIds } : undefined,
      ...(gradeLevel != null ? { gradeLevel } : {}),
      ...conceptFilter,
    },
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
      solution: true,
      primaryConcept: true,
    },
    take: limit,
    orderBy: { problemNumber: "asc" },
  });
}

export async function listConceptSections(gradeLevel = 5, subject = "math") {
  const concepts = await prisma.practiceConcept.findMany({
    where: { gradeLevel, subject },
    orderBy: [{ domain: "asc" }, { sortOrder: "asc" }],
  });

  const conceptIds = concepts.map((c) => c.id);
  const counts =
    conceptIds.length > 0
      ? await prisma.pdfPracticeProblem.groupBy({
          by: ["primaryConceptId"],
          where: {
            approvedForStudentUse: true,
            reviewStatus: "approved",
            primaryConceptId: { in: conceptIds },
            gradeLevel,
          },
          _count: { id: true },
        })
      : [];
  const countMap = new Map(
    counts
      .filter((r) => r.primaryConceptId)
      .map((r) => [r.primaryConceptId!, r._count.id]),
  );
  return concepts.map((c) => ({
    ...c,
    approvedProblemCount: countMap.get(c.id) ?? 0,
  }));
}

function conceptGradeKey(conceptId: string, gradeLevel: number) {
  return `${conceptId}:${gradeLevel}`;
}

/** Approved problem counts per concept and problem grade (same topic can appear in multiple grades). */
async function approvedProblemCountByConceptAndGrade() {
  const counts = await prisma.pdfPracticeProblem.groupBy({
    by: ["primaryConceptId", "gradeLevel"],
    where: {
      approvedForStudentUse: true,
      reviewStatus: "approved",
      primaryConceptId: { not: null },
      gradeLevel: { not: null },
    },
    _count: { id: true },
  });
  const map = new Map<string, number>();
  for (const row of counts) {
    if (!row.primaryConceptId || row.gradeLevel == null) continue;
    map.set(conceptGradeKey(row.primaryConceptId, row.gradeLevel), row._count.id);
  }
  return map;
}

export function formatProblemCount(count: number): string {
  return count === 1 ? "1 problem" : `${count} problems`;
}

export type PracticeTopicItem = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  gradeLevel: number;
  totalCount: number;
  doneCount: number;
  leftCount: number;
};

export type PracticeSubjectGroup = {
  subject: string;
  label: string;
  domains: { domain: string; topics: PracticeTopicItem[] }[];
};

export type PracticeGradeGroup = {
  gradeLevel: number;
  label: string;
  subjects: PracticeSubjectGroup[];
};

export function formatPracticeSubjectLabel(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("english") || s.includes("ela") || s.includes("reading")) return "English";
  if (s.includes("math")) return "Math";
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

/** All approved PDF topics grouped by grade → subject → domain. */
export async function listPracticeTopicCatalog(options?: {
  progressScope?: ProgressScope | null;
}): Promise<PracticeGradeGroup[]> {
  const progressScope = options?.progressScope ?? null;

  const [concepts, countMap, doneByConceptGrade] = await Promise.all([
    prisma.practiceConcept.findMany({
      orderBy: [
        { gradeLevel: "asc" },
        { subject: "asc" },
        { domain: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    }),
    approvedProblemCountByConceptAndGrade(),
    progressScope
      ? getDoneCountByConceptAndGrade(progressScope)
      : Promise.resolve(new Map<string, number>()),
  ]);

  type DomainMap = Map<string, PracticeTopicItem[]>;
  type SubjectMap = Map<string, DomainMap>;
  const byGrade = new Map<number, SubjectMap>();

  for (const concept of concepts) {
    const subjectKey = concept.subject || "other";
    const domain = concept.domain?.trim() || "General";

    for (const [key, approvedProblemCount] of countMap) {
      if (!key.startsWith(`${concept.id}:`)) continue;
      const gradeLevel = parseInt(key.split(":")[1]!, 10);
      if (!Number.isFinite(gradeLevel) || approvedProblemCount === 0) continue;

      if (!byGrade.has(gradeLevel)) byGrade.set(gradeLevel, new Map());
      const subjectMap = byGrade.get(gradeLevel)!;
      if (!subjectMap.has(subjectKey)) subjectMap.set(subjectKey, new Map());
      const domainMap = subjectMap.get(subjectKey)!;
      if (!domainMap.has(domain)) domainMap.set(domain, []);

      const doneCount = doneByConceptGrade.get(key) ?? 0;
      domainMap.get(domain)!.push({
        id: concept.id,
        name: concept.name,
        slug: concept.slug,
        domain,
        gradeLevel,
        totalCount: approvedProblemCount,
        doneCount,
        leftCount: Math.max(0, approvedProblemCount - doneCount),
      });
    }
  }

  const subjectOrder = (a: string, b: string) => {
    const rank = (s: string) => {
      const lower = s.toLowerCase();
      if (lower.includes("math")) return 0;
      if (lower.includes("english") || lower.includes("ela")) return 1;
      return 2;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  };

  return [...byGrade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([gradeLevel, subjectMap]) => ({
      gradeLevel,
      label: gradeLevel > 0 ? `Grade ${gradeLevel}` : "Other",
      subjects: [...subjectMap.entries()]
        .sort(([a], [b]) => subjectOrder(a, b))
        .map(([subject, domainMap]) => ({
          subject,
          label: formatPracticeSubjectLabel(subject),
          domains: [...domainMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([domain, topics]) => ({ domain, topics })),
        })),
    }));
}
