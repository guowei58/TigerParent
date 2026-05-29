import type { Problem } from "@/generated/prisma/client";
import { prisma } from "./db";
import { studentVisibleProblemWhere } from "./problem-student-gate";
import type { Prisma } from "@/generated/prisma/client";

/** When true, hide legacy bank problems so students only see PDF-upload practice. Default: both. */
export function isPdfPracticeOnly(): boolean {
  return process.env.PDF_PRACTICE_ONLY === "true";
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Problems this student has attempted or been assigned to see. */
export async function getSeenProblemIds(studentId: string): Promise<Set<string>> {
  const [exposures, attempts] = await Promise.all([
    prisma.studentProblemExposure.findMany({
      where: { studentId },
      select: { problemId: true },
    }),
    prisma.attempt.findMany({
      where: { studentId },
      select: { problemId: true },
      distinct: ["problemId"],
    }),
  ]);

  return new Set([
    ...exposures.map((row) => row.problemId),
    ...attempts.map((row) => row.problemId),
  ]);
}

/** @deprecated Use getSeenProblemIds */
export async function getAttemptedProblemIds(studentId: string): Promise<Set<string>> {
  return getSeenProblemIds(studentId);
}

export async function recordProblemExposures(
  studentId: string,
  problemIds: string[],
  sessionId?: string,
) {
  const unique = [...new Set(problemIds.filter(Boolean))];
  if (!unique.length) return;

  await prisma.$transaction(
    unique.map((problemId) =>
      prisma.studentProblemExposure.upsert({
        where: {
          studentId_problemId: { studentId, problemId },
        },
        create: { studentId, problemId, sessionId },
        update: sessionId ? { sessionId } : {},
      }),
    ),
  );
}

type SelectFreshOptions = {
  studentId: string;
  count: number;
  skillId?: string;
  skillIds?: string[];
  orderByDifficulty?: boolean;
  excludeProblemIds?: string[];
  sessionId?: string;
  sessionType?: string;
  recordExposure?: boolean;
  usageTypes?: string[];
};

function buildProblemWhere(
  skillId: string | undefined,
  skillIds: string[] | undefined,
  excludeIds: string[],
  sessionType?: string,
  usageTypes?: string[],
) {
  const where: Prisma.ProblemWhereInput = {
    ...studentVisibleProblemWhere(sessionType),
  };

  if (skillId) {
    where.skillId = skillId;
  } else if (skillIds?.length) {
    where.skillId = { in: skillIds };
  }

  if (excludeIds.length) {
    where.id = { notIn: excludeIds };
  }

  if (usageTypes?.length) {
    where.usageType = { in: usageTypes as never[] };
  }

  return where;
}

/** Pick problems this student has never been shown before. */
export async function selectFreshProblemsForStudent(
  options: SelectFreshOptions,
): Promise<Problem[]> {
  const {
    studentId,
    count,
    skillId,
    skillIds,
    orderByDifficulty = true,
    excludeProblemIds = [],
    sessionId,
    sessionType,
    recordExposure = false,
    usageTypes,
  } = options;

  if (count <= 0) return [];

  if (isPdfPracticeOnly()) return [];

  const seen = await getSeenProblemIds(studentId);
  const exclude = new Set([...seen, ...excludeProblemIds]);
  const excludeIds = [...exclude];

  const where = buildProblemWhere(skillId, skillIds, excludeIds, sessionType, usageTypes);
  const poolSize = Math.min(Math.max(count * 8, count), 250);

  const pool = await prisma.problem.findMany({
    where,
    take: poolSize,
    orderBy: [
      { confidenceScore: "desc" },
      ...(orderByDifficulty ? [{ difficulty: "asc" as const }] : [{ id: "asc" as const }]),
    ],
  });

  const selected = shuffle(pool).slice(0, count);

  if (recordExposure && selected.length) {
    await recordProblemExposures(
      studentId,
      selected.map((problem) => problem.id),
      sessionId,
    );
  }

  return selected;
}

export async function selectFreshProblemIdsForStudent(
  options: SelectFreshOptions,
): Promise<string[]> {
  const problems = await selectFreshProblemsForStudent(options);
  return problems.map((problem) => problem.id);
}

export async function loadProblemsByIds(ids: string[]): Promise<Problem[]> {
  if (!ids.length) return [];
  const rows = await prisma.problem.findMany({
    where: {
      id: { in: ids },
      ...studentVisibleProblemWhere(),
    },
  });
  const byId = new Map(rows.map((problem) => [problem.id, problem]));
  return ids.map((id) => byId.get(id)).filter((problem): problem is Problem => Boolean(problem));
}

/** First unseen approved problem for a skill, or null if exhausted. */
export async function selectFreshProblemForSkill(
  studentId: string,
  skillId: string,
  skipIds: string[] = [],
): Promise<Problem | null> {
  const problems = await selectFreshProblemsForStudent({
    studentId,
    skillId,
    count: 1,
    excludeProblemIds: skipIds,
  });
  return problems[0] ?? null;
}

/** Build or refresh a practice session problem list with only unseen problems. */
export async function assignPracticeProblems(
  studentId: string,
  skillId: string,
  count: number,
  sessionId: string,
  existingIds: string[] = [],
): Promise<Problem[]> {
  const seen = await getSeenProblemIds(studentId);
  const kept = existingIds.filter((id) => !seen.has(id));

  if (kept.length >= count) {
    const problems = await loadProblemsByIds(kept.slice(0, count));
    await recordProblemExposures(studentId, problems.map((p) => p.id), sessionId);
    return problems;
  }

  const reserved = new Set(kept);
  const fresh = await selectFreshProblemsForStudent({
    studentId,
    skillId,
    count: count - kept.length,
    excludeProblemIds: [...reserved],
    sessionId,
    recordExposure: true,
  });

  const ids = [...kept, ...fresh.map((p) => p.id)];
  await recordProblemExposures(studentId, ids, sessionId);
  return loadProblemsByIds(ids);
}

export async function countUnseenProblemsForSkill(
  studentId: string,
  skillId: string,
): Promise<number> {
  const seen = await getSeenProblemIds(studentId);
  const excludeIds = [...seen];
  return prisma.problem.count({
    where: {
      skillId,
      ...studentVisibleProblemWhere(),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
  });
}
