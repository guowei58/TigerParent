import { prisma } from "@/lib/db";
import {
  resolveProblemProgressFromAttempts,
  type PdfPracticeProgress,
  type PdfProblemProgressStatus,
} from "@/lib/pdf-practice/progress-shared";

export type { PdfPracticeProgress, PdfProblemProgressStatus };
export {
  buildPdfPracticeProgress,
  countProgressStatuses,
  findFirstIncompleteIndex,
  resolveProblemProgressFromAttempts,
} from "@/lib/pdf-practice/progress-shared";

export type ProgressScope =
  | { studentProfileId: string }
  | { userId: string };

function scopeWhere(scope: ProgressScope, problemIds: string[]) {
  return {
    problemId: { in: problemIds },
    ...("studentProfileId" in scope
      ? { studentProfileId: scope.studentProfileId }
      : { userId: scope.userId }),
  };
}

export function progressScopeFromSession(user: {
  id: string;
  studentProfileId?: string | null;
}): ProgressScope | null {
  if (user.studentProfileId) {
    return { studentProfileId: user.studentProfileId };
  }
  return { userId: user.id };
}

export async function getPdfProblemProgressMap(
  scope: ProgressScope,
  problemIds: string[],
): Promise<Map<string, PdfProblemProgressStatus>> {
  const map = new Map<string, PdfProblemProgressStatus>();
  if (problemIds.length === 0) return map;

  const attempts = await prisma.pdfProblemAttempt.findMany({
    where: scopeWhere(scope, problemIds),
    select: { problemId: true, isCorrect: true, skipped: true, freeResponseText: true },
    orderBy: { createdAt: "asc" },
  });

  const byProblem = new Map<
    string,
    { isCorrect: boolean | null; skipped: boolean; freeResponseText?: string | null }[]
  >();
  for (const a of attempts) {
    const list = byProblem.get(a.problemId) ?? [];
    list.push({
      isCorrect: a.isCorrect,
      skipped: a.skipped,
      freeResponseText: a.freeResponseText,
    });
    byProblem.set(a.problemId, list);
  }

  for (const problemId of problemIds) {
    const status = resolveProblemProgressFromAttempts(byProblem.get(problemId) ?? []);
    if (status) map.set(problemId, status);
  }

  return map;
}

/** How many approved problems per topic the student has finished (answered or skipped). */
export async function getDoneCountByConceptId(
  scope: ProgressScope,
): Promise<Map<string, number>> {
  const byGrade = await getDoneCountByConceptAndGrade(scope);
  const totals = new Map<string, number>();
  for (const [key, count] of byGrade) {
    const conceptId = key.split(":")[0]!;
    totals.set(conceptId, (totals.get(conceptId) ?? 0) + count);
  }
  return totals;
}

/** Done counts keyed by `conceptId:gradeLevel` for grade-aware topic catalog. */
export async function getDoneCountByConceptAndGrade(
  scope: ProgressScope,
): Promise<Map<string, number>> {
  const problems = await prisma.pdfPracticeProblem.findMany({
    where: {
      approvedForStudentUse: true,
      reviewStatus: "approved",
      primaryConceptId: { not: null },
      gradeLevel: { not: null },
    },
    select: { id: true, primaryConceptId: true, gradeLevel: true },
  });

  if (problems.length === 0) return new Map();

  const progressMap = await getPdfProblemProgressMap(
    scope,
    problems.map((p) => p.id),
  );

  const done = new Map<string, number>();
  for (const problem of problems) {
    if (!problem.primaryConceptId || problem.gradeLevel == null) continue;
    if (!progressMap.has(problem.id)) continue;
    const key = `${problem.primaryConceptId}:${problem.gradeLevel}`;
    done.set(key, (done.get(key) ?? 0) + 1);
  }
  return done;
}

export async function recordPdfProblemSkipped(
  scope: ProgressScope,
  problemId: string,
  userId: string,
  options?: {
    timeSpentSeconds?: number;
    strokes?: unknown;
    drawingSeconds?: number;
  },
): Promise<
  | { ok: true }
  | { ok: false; error: string; workFeedback: string | null }
> {
  const existing = await getPdfProblemProgressMap(scope, [problemId]);
  if (existing.has(problemId)) return { ok: true };

  const { recordPdfProblemAttempt } = await import("@/lib/pdf-practice/record-attempt");
  const result = await recordPdfProblemAttempt({
    problemId,
    userId,
    studentProfileId:
      "studentProfileId" in scope ? scope.studentProfileId : undefined,
    skipped: true,
    isCorrect: null,
    timeSpentSeconds: options?.timeSpentSeconds ?? null,
    strokes: options?.strokes,
    drawingSeconds: options?.drawingSeconds,
  });

  if (!result.ok) return result;
  return { ok: true };
}

export async function progressStatusAfterCorrectAnswer(
  scope: ProgressScope,
  problemId: string,
): Promise<"correct" | "incorrect"> {
  const hadWrong = await prisma.pdfProblemAttempt.count({
    where: {
      ...("studentProfileId" in scope
        ? { studentProfileId: scope.studentProfileId }
        : { userId: scope.userId }),
      problemId,
      skipped: false,
      isCorrect: false,
    },
  });
  return hadWrong > 0 ? "incorrect" : "correct";
}
