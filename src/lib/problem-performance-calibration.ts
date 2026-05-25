import { prisma } from "@/lib/db";

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx]!;
}

export async function updateProblemPerformanceStats(problemId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { problemId },
    select: {
      isCorrect: true,
      elapsedSeconds: true,
    },
  });

  if (!attempts.length) return null;

  const correctRate =
    attempts.filter((a) => a.isCorrect).length / attempts.length;
  const times = attempts.map((a) => a.elapsedSeconds);
  const flags = await prisma.problemFlag.groupBy({
    by: ["reason"],
    where: { problemId, status: { in: ["OPEN", "REVIEWED"] } },
    _count: { _all: true },
  });

  const flaggedByStudentsCount = flags.reduce((sum, f) => sum + f._count._all, 0);

  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { difficulty: true, targetSeconds: true },
  });

  const difficultyEstimate = problem
    ? Math.min(
        10,
        Math.max(
          1,
          Math.round(
            (1 - correctRate) * 5 +
              (median(times) / Math.max(problem.targetSeconds, 1)) * 2.5,
          ),
        ),
      )
    : 5;

  const stats = await prisma.problemPerformanceStats.upsert({
    where: { problemId },
    create: {
      problemId,
      attemptsCount: attempts.length,
      correctRate,
      medianSeconds: median(times),
      p25Seconds: percentile(times, 25),
      p75Seconds: percentile(times, 75),
      skipRate: 0,
      hintRate: 0,
      flaggedByStudentsCount,
      flaggedByParentsCount: 0,
      difficultyEstimate,
    },
    update: {
      attemptsCount: attempts.length,
      correctRate,
      medianSeconds: median(times),
      p25Seconds: percentile(times, 25),
      p75Seconds: percentile(times, 75),
      flaggedByStudentsCount,
      difficultyEstimate,
      lastUpdatedAt: new Date(),
    },
  });

  await maybeFlagProblemForReview(problemId, {
    attemptsCount: attempts.length,
    correctRate: stats.correctRate,
    medianSeconds: stats.medianSeconds,
    flaggedByStudentsCount: stats.flaggedByStudentsCount,
  }, problem);
  return stats;
}

async function maybeFlagProblemForReview(
  problemId: string,
  stats: {
    attemptsCount: number;
    correctRate: number;
    medianSeconds: number;
    flaggedByStudentsCount: number;
  },
  problem: { difficulty: number; targetSeconds: number } | null,
) {
  if (!problem || stats.attemptsCount < 10) return;

  const expectedHardness = problem.difficulty / 10;
  const expectedCorrect = Math.max(0.35, 1 - expectedHardness * 0.5);
  const timeRatio = stats.medianSeconds / Math.max(problem.targetSeconds, 1);

  const suspicious =
    stats.correctRate < expectedCorrect - 0.25 ||
    stats.correctRate > expectedCorrect + 0.3 ||
    timeRatio > 2.5 ||
    stats.flaggedByStudentsCount >= 3;

  if (!suspicious) return;

  await prisma.problem.update({
    where: { id: problemId },
    data: {
      reviewStatus: "NEEDS_REVIEW",
      studentReady: false,
      approved: false,
    },
  });

  await prisma.problemQualityReview.create({
    data: {
      problemId,
      reviewerType: "SYSTEM",
      reviewerName: "performance-calibration",
      status: "NEEDS_REVIEW",
      difficultyCheck: stats.correctRate < expectedCorrect - 0.25 ? "FAIL" : "WARNING",
      notes: `Auto-flagged: correctRate=${Math.round(stats.correctRate * 100)}%, median=${Math.round(stats.medianSeconds)}s, flags=${stats.flaggedByStudentsCount}`,
    },
  });
}
