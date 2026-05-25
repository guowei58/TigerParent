import { prisma } from "./db";

const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
export const MISTAKE_REVIEW_LOOKBACK_DAYS = 7;

export type MistakeDayGroup = {
  dateKey: string;
  label: string;
  count: number;
  reviewed: boolean;
};

export function toMistakeDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mistakeDayBounds(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${dateKey}T23:59:59.999`);
  return { start, end };
}

export function formatMistakeDayLabel(dateKey: string, now = new Date()): string {
  const todayKey = toMistakeDateKey(now);
  if (dateKey === todayKey) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toMistakeDateKey(yesterday)) return "Yesterday";

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function getDueReviewItems(
  studentId: string,
  limit = 5,
  subjectId?: string,
) {
  return prisma.reviewQueueItem.findMany({
    where: {
      studentId,
      completed: false,
      dueAt: { lte: new Date() },
      ...(subjectId ? { skill: { subjectId } } : {}),
    },
    include: { skill: { include: { subject: true } } },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    take: limit,
  });
}

export async function completeReviewItem(itemId: string, passed: boolean) {
  const item = await prisma.reviewQueueItem.findUniqueOrThrow({
    where: { id: itemId },
  });

  await prisma.reviewQueueItem.update({
    where: { id: itemId },
    data: { completed: true },
  });

  const mastery = await prisma.masteryState.findUnique({
    where: {
      studentId_skillId: {
        studentId: item.studentId,
        skillId: item.skillId,
      },
    },
  });

  if (!mastery) return;

  if (passed) {
    const currentInterval = mastery.reviewIntervalDays ?? 1;
    const nextIdx = REVIEW_INTERVALS.indexOf(currentInterval);
    const nextInterval =
      nextIdx >= 0 && nextIdx < REVIEW_INTERVALS.length - 1
        ? REVIEW_INTERVALS[nextIdx + 1]
        : 30;

    await prisma.masteryState.update({
      where: { id: mastery.id },
      data: {
        retentionScore: Math.min(mastery.retentionScore + 0.15, 1),
        nextReviewAt: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000),
        reviewIntervalDays: nextInterval,
        status: "MASTERED",
      },
    });
  } else {
    await prisma.masteryState.update({
      where: { id: mastery.id },
      data: {
        retentionScore: Math.max(mastery.retentionScore - 0.25, 0),
        masteryScore: Math.max(mastery.masteryScore - 15, 0),
        status: mastery.masteryScore < 60 ? "REGRESSED" : "REVIEW",
        nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await prisma.reviewQueueItem.create({
      data: {
        studentId: item.studentId,
        skillId: item.skillId,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 3,
      },
    });
  }
}

export async function getMistakesForReview(
  studentId: string,
  limit = 10,
  subjectId?: string,
  dateKey?: string,
) {
  const dayBounds = dateKey ? mistakeDayBounds(dateKey) : null;

  return prisma.attempt.findMany({
    where: {
      studentId,
      isCorrect: false,
      ...(dayBounds
        ? { createdAt: { gte: dayBounds.start, lte: dayBounds.end } }
        : {}),
      ...(subjectId ? { problem: { skill: { subjectId } } } : {}),
    },
    include: {
      problem: { include: { skill: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    distinct: ["problemId"],
  });
}

export async function getReviewedMistakeDateKeys(
  studentId: string,
  subjectId: string,
  since: Date,
): Promise<Set<string>> {
  const rows = await prisma.mistakeDayReview.findMany({
    where: {
      studentId,
      subjectId,
      mistakeDate: { gte: since },
    },
    select: { mistakeDate: true },
  });

  return new Set(rows.map((row) => toMistakeDateKey(row.mistakeDate)));
}

export async function getMistakeDayGroups(
  studentId: string,
  subjectId: string,
  lookbackDays = MISTAKE_REVIEW_LOOKBACK_DAYS,
): Promise<MistakeDayGroup[]> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  since.setHours(0, 0, 0, 0);

  const [attempts, reviewedKeys] = await Promise.all([
    prisma.attempt.findMany({
      where: {
        studentId,
        isCorrect: false,
        createdAt: { gte: since },
        problem: { skill: { subjectId } },
      },
      select: { createdAt: true, problemId: true },
      orderBy: { createdAt: "desc" },
    }),
    getReviewedMistakeDateKeys(studentId, subjectId, since),
  ]);

  const problemsByDay = new Map<string, Set<string>>();
  for (const attempt of attempts) {
    const dateKey = toMistakeDateKey(attempt.createdAt);
    if (!problemsByDay.has(dateKey)) {
      problemsByDay.set(dateKey, new Set());
    }
    problemsByDay.get(dateKey)!.add(attempt.problemId);
  }

  return [...problemsByDay.entries()]
    .map(([dateKey, problemIds]) => ({
      dateKey,
      label: formatMistakeDayLabel(dateKey),
      count: problemIds.size,
      reviewed: reviewedKeys.has(dateKey),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export async function markMistakeDayReviewed(
  studentId: string,
  subjectId: string,
  dateKey: string,
) {
  const mistakeDate = new Date(`${dateKey}T12:00:00`);

  return prisma.mistakeDayReview.upsert({
    where: {
      studentId_subjectId_mistakeDate: {
        studentId,
        subjectId,
        mistakeDate,
      },
    },
    create: {
      studentId,
      subjectId,
      mistakeDate,
    },
    update: {
      reviewedAt: new Date(),
    },
  });
}

export function countUnreviewedMistakes(days: MistakeDayGroup[]): number {
  return days.filter((day) => !day.reviewed).reduce((sum, day) => sum + day.count, 0);
}
