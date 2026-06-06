import { prisma } from "@/lib/db";
import {
  formatPracticeSubjectLabel,
  type PracticeGradeGroup,
  type PracticePassageItem,
  type PracticeTopicItem,
} from "@/lib/pdf-practice/catalogTypes";
import {
  getDoneCountByConceptAndGrade,
  getPdfProblemProgressMap,
  type ProgressScope,
} from "@/lib/pdf-practice/progress";
import { countProgressStatuses, type PdfProblemProgressStatus } from "@/lib/pdf-practice/progress-shared";

function isEnglishSubject(subject: string): boolean {
  const s = subject.toLowerCase();
  return s.includes("english") || s.includes("ela") || s.includes("reading");
}

export async function selectApprovedPdfProblems(options: {
  conceptSlug?: string;
  conceptId?: string;
  passageId?: string;
  gradeLevel?: number;
  limit?: number;
  excludeIds?: string[];
}) {
  const { conceptSlug, conceptId, passageId, gradeLevel, limit = 10, excludeIds = [] } = options;

  const conceptFilter =
    passageId != null
      ? {}
      : conceptId
        ? { primaryConceptId: conceptId }
        : conceptSlug
          ? { primaryConcept: { slug: conceptSlug } }
          : {};

  return prisma.pdfPracticeProblem.findMany({
    where: {
      approvedForStudentUse: true,
      reviewStatus: "approved",
      id: excludeIds.length ? { notIn: excludeIds } : undefined,
      ...(passageId ? { passageId } : {}),
      ...(gradeLevel != null && !passageId ? { gradeLevel } : {}),
      ...conceptFilter,
    },
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
      solution: true,
      primaryConcept: true,
      passage: true,
    },
    take: limit,
    orderBy: [{ passageId: "asc" }, { problemNumber: "asc" }],
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

export type {
  PracticeGradeGroup,
  PracticePassageItem,
  PracticeSubjectGroup,
  PracticeTopicItem,
} from "@/lib/pdf-practice/catalogTypes";
export { formatPracticeSubjectLabel } from "@/lib/pdf-practice/catalogTypes";

function passageCatalogTitle(passage: {
  title: string | null;
  promptText: string | null;
  passageNumber: number;
}): string {
  if (passage.title?.trim()) return passage.title.trim();
  if (passage.promptText?.trim()) {
    const text = passage.promptText.trim().replace(/\s+/g, " ");
    return text.length > 90 ? `${text.slice(0, 87)}…` : text;
  }
  return `Passage ${passage.passageNumber}`;
}

async function listElaPassageCatalogItems(
  progressScope: ProgressScope | null,
): Promise<PracticePassageItem[]> {
  const passages = await prisma.pdfReadingPassage.findMany({
    where: {
      problems: {
        some: {
          approvedForStudentUse: true,
          reviewStatus: "approved",
        },
      },
    },
    include: {
      sourceDocument: { select: { title: true, gradeLevel: true } },
      problems: {
        where: { approvedForStudentUse: true, reviewStatus: "approved" },
        select: { id: true, gradeLevel: true },
        orderBy: { problemNumber: "asc" },
      },
    },
    orderBy: [{ sourceDocumentId: "asc" }, { passageNumber: "asc" }],
  });

  const allProblemIds = passages.flatMap((p) => p.problems.map((problem) => problem.id));
  const progressMap =
    progressScope && allProblemIds.length > 0
      ? await getPdfProblemProgressMap(progressScope, allProblemIds)
      : new Map<string, PdfProblemProgressStatus>();

  return passages
    .map((passage) => {
      const gradeLevel =
        passage.sourceDocument.gradeLevel ??
        passage.problems.find((p) => p.gradeLevel != null)?.gradeLevel ??
        0;
      const problemIds = passage.problems.map((p) => p.id);
      const byProblemId: Record<string, PdfProblemProgressStatus> = {};
      for (const id of problemIds) {
        const status = progressMap.get(id);
        if (status) byProblemId[id] = status;
      }
      const stats = countProgressStatuses(byProblemId);

      return {
        id: passage.id,
        passageNumber: passage.passageNumber,
        title: passageCatalogTitle(passage),
        subtitle: passage.sourceDocument.title,
        gradeLevel,
        totalCount: problemIds.length,
        doneCount: stats.done,
        leftCount: Math.max(0, problemIds.length - stats.done),
      };
    })
    .filter((p) => p.totalCount > 0);
}

/** All approved PDF topics grouped by grade → subject → domain (math) or passages (ELA). */
export async function listPracticeTopicCatalog(options?: {
  progressScope?: ProgressScope | null;
}): Promise<PracticeGradeGroup[]> {
  const progressScope = options?.progressScope ?? null;

  const [concepts, countMap, doneByConceptGrade, passageItems] = await Promise.all([
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
    listElaPassageCatalogItems(progressScope),
  ]);

  type DomainMap = Map<string, PracticeTopicItem[]>;
  type SubjectMap = Map<
    string,
    { domains: DomainMap; passages: PracticePassageItem[] }
  >;
  const byGrade = new Map<number, SubjectMap>();

  function ensureSubject(gradeLevel: number, subjectKey: string) {
    if (!byGrade.has(gradeLevel)) byGrade.set(gradeLevel, new Map());
    const subjectMap = byGrade.get(gradeLevel)!;
    if (!subjectMap.has(subjectKey)) {
      subjectMap.set(subjectKey, { domains: new Map(), passages: [] });
    }
    return subjectMap.get(subjectKey)!;
  }

  for (const concept of concepts) {
    const subjectKey = concept.subject || "other";
    if (isEnglishSubject(subjectKey)) continue;

    const domain = concept.domain?.trim() || "General";

    for (const [key, approvedProblemCount] of countMap) {
      if (!key.startsWith(`${concept.id}:`)) continue;
      const gradeLevel = parseInt(key.split(":")[1]!, 10);
      if (!Number.isFinite(gradeLevel) || approvedProblemCount === 0) continue;

      const subject = ensureSubject(gradeLevel, subjectKey);
      if (!subject.domains.has(domain)) subject.domains.set(domain, []);

      const doneCount = doneByConceptGrade.get(key) ?? 0;
      subject.domains.get(domain)!.push({
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

  for (const passage of passageItems) {
    const subject = ensureSubject(passage.gradeLevel, "english");
    subject.passages.push(passage);
  }

  for (const subject of byGrade.values()) {
    for (const entry of subject.values()) {
      entry.passages.sort(
        (a, b) => a.passageNumber - b.passageNumber || a.title.localeCompare(b.title),
      );
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
        .map(([subject, entry]) => ({
          subject,
          label: formatPracticeSubjectLabel(subject),
          domains: [...entry.domains.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([domain, topics]) => ({ domain, topics })),
          passages: entry.passages.length > 0 ? entry.passages : undefined,
        })),
    }));
}
