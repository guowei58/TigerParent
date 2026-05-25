import type { MasteryState, Skill } from "@/generated/prisma/client";
import { prisma } from "./db";

export type MasteryInput = {
  accuracy: number;
  medianSeconds: number;
  retentionScore: number;
  consistencyScore: number;
  targetAccuracy: number;
  targetMedianSeconds: number;
};

export function computeMasteryScore(input: MasteryInput): number {
  const accuracyScore = Math.min(input.accuracy / input.targetAccuracy, 1) * 50;
  const speedRatio = input.targetMedianSeconds / Math.max(input.medianSeconds, 1);
  const speedScore = Math.min(speedRatio, 1) * 20;
  const retentionScore = input.retentionScore * 20;
  const consistencyScore = input.consistencyScore * 10;
  return Math.round(
    Math.min(accuracyScore + speedScore + retentionScore + consistencyScore, 100),
  );
}

export function checkMastery(
  state: Pick<
    MasteryState,
    | "accuracy"
    | "medianSeconds"
    | "attemptsCount"
    | "sessionsCount"
    | "retentionScore"
    | "challengeScore"
    | "masteryScore"
  >,
  skill: Pick<
    Skill,
    | "targetAccuracy"
    | "targetMedianSeconds"
    | "minProblemsForMastery"
    | "minSessionsForMastery"
    | "isFoundationSkill"
    | "applicationAccuracyRequired"
  >,
  options?: { hasHighConfidenceBenchmark?: boolean },
): boolean {
  const minAttempts = skill.isFoundationSkill
    ? Math.max(skill.minProblemsForMastery, 30)
    : skill.minProblemsForMastery;
  const minSessions = skill.isFoundationSkill
    ? Math.max(skill.minSessionsForMastery, 3)
    : skill.minSessionsForMastery;
  const targetAccuracy = skill.isFoundationSkill
    ? Math.max(skill.targetAccuracy, 0.92)
    : skill.targetAccuracy;
  const challengeThreshold = skill.isFoundationSkill ? 0.9 : 0.85;

  return (
    state.accuracy >= targetAccuracy &&
    state.medianSeconds <= skill.targetMedianSeconds &&
    state.attemptsCount >= minAttempts &&
    state.sessionsCount >= minSessions &&
    (state.retentionScore >= 0.7 || state.sessionsCount >= minSessions + 1) &&
    (state.challengeScore ?? 0) >= challengeThreshold &&
    state.masteryScore >= (skill.isFoundationSkill ? 90 : 85) &&
    (!skill.isFoundationSkill || options?.hasHighConfidenceBenchmark !== false)
  );
}

export async function updateMasteryAfterAttempt(
  studentId: string,
  skillId: string,
  sessionId: string,
) {
  const skill = await prisma.skill.findUniqueOrThrow({ where: { id: skillId } });
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId,
      problem: { skillId },
    },
    include: {
      problem: {
        select: {
          confidenceLevel: true,
          contentClass: true,
          usageType: true,
          difficultyTier: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const sessionIds = new Set(
    attempts.map((a) => a.sessionId).concat(sessionId),
  );
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracy = attempts.length ? correctCount / attempts.length : 0;
  const times = attempts.map((a) => a.elapsedSeconds).sort((a, b) => a - b);
  const medianSeconds =
    times.length === 0
      ? 0
      : times.length % 2 === 1
        ? times[Math.floor(times.length / 2)]
        : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;

  const existing = await prisma.masteryState.findUnique({
    where: { studentId_skillId: { studentId, skillId } },
  });

  const retentionScore = existing?.retentionScore ?? 0;
  const consistencyScore = Math.min(sessionIds.size / 3, 1);

  const masteryScore = computeMasteryScore({
    accuracy,
    medianSeconds,
    retentionScore,
    consistencyScore,
    targetAccuracy: skill.targetAccuracy,
    targetMedianSeconds: skill.targetMedianSeconds,
  });

  const sessionsCount = sessionIds.size;

  const highConfidenceCorrect = attempts.filter(
    (a) =>
      a.isCorrect &&
      (a.problem.confidenceLevel === "HIGH" ||
        a.problem.contentClass === "OFFICIAL_RELEASED"),
  ).length;
  const applicationCorrect = attempts.filter(
    (a) =>
      a.isCorrect &&
      (a.problem.difficultyTier === "APPLICATION" ||
        a.problem.difficultyTier === "MIXED_REVIEW" ||
        a.problem.difficultyTier === "CHALLENGE"),
  ).length;

  const hasHighConfidenceBenchmark =
    !skill.isFoundationSkill ||
    (highConfidenceCorrect >= 3 && applicationCorrect >= 5);

  const isMastered = checkMastery(
    {
      accuracy,
      medianSeconds,
      attemptsCount: attempts.length,
      sessionsCount,
      retentionScore,
      challengeScore: existing?.challengeScore ?? null,
      masteryScore,
    },
    skill,
    { hasHighConfidenceBenchmark },
  );

  const status = isMastered
    ? "MASTERED"
    : attempts.length === 0
      ? "NOT_STARTED"
      : sessionsCount >= 2
        ? "PRACTICING"
        : "LEARNING";

  const state = await prisma.masteryState.upsert({
    where: { studentId_skillId: { studentId, skillId } },
    create: {
      studentId,
      skillId,
      masteryScore,
      accuracy,
      medianSeconds,
      attemptsCount: attempts.length,
      correctCount,
      sessionsCount,
      retentionScore,
      status,
      lastPracticedAt: new Date(),
      nextReviewAt: isMastered
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : null,
      reviewIntervalDays: isMastered ? 1 : null,
    },
    update: {
      masteryScore,
      accuracy,
      medianSeconds,
      attemptsCount: attempts.length,
      correctCount,
      sessionsCount,
      status,
      lastPracticedAt: new Date(),
      ...(isMastered && !existing?.nextReviewAt
        ? {
            nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            reviewIntervalDays: 1,
          }
        : {}),
    },
  });

  if (isMastered && existing?.status !== "MASTERED") {
    await prisma.achievement.create({
      data: {
        studentId,
        type: "SKILL_MASTERED",
        title: `${skill.title} Mastered!`,
        description: `You mastered ${skill.title} with ${Math.round(accuracy * 100)}% accuracy.`,
      },
    });

    const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
    for (const days of REVIEW_INTERVALS) {
      await prisma.reviewQueueItem.create({
        data: {
          studentId,
          skillId,
          dueAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          priority: days === 1 ? 3 : days <= 7 ? 2 : 1,
        },
      });
    }

    await advanceToNextSkill(studentId, skill);
  }

  const { evaluateAdaptivePlacement } = await import("./adaptive-placement");
  const placementChange = await evaluateAdaptivePlacement(studentId, skillId);

  return { state, placementChange };
}

export async function advanceToNextSkill(studentId: string, currentSkill: Skill) {
  const { getNextVisibleSkillInPlan } = await import("./skill-progression");
  const nextSkill = await getNextVisibleSkillInPlan(currentSkill.id);

  if (nextSkill) {
    const nextLevel = await prisma.level.findUnique({
      where: { id: nextSkill.levelId },
    });
    await prisma.studentSubjectPlacement.updateMany({
      where: { studentId, subjectId: currentSkill.subjectId },
      data: {
        currentSkillId: nextSkill.id,
        ...(nextLevel && nextSkill.levelId !== currentSkill.levelId
          ? {
              currentLevelId: nextLevel.id,
              assessedGradeLevel: nextLevel.nominalGradeLevel,
            }
          : {}),
        lastUpdatedAt: new Date(),
      },
    });
    return nextSkill;
  }

  return null;
}

export async function awardXp(
  studentId: string,
  baseXp: number,
  accuracyBonus = 0,
  streakBonus = 0,
) {
  const total = baseXp + accuracyBonus + streakBonus;
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: { xp: { increment: total } },
  });
  return total;
}

export async function updateStreak(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!student.lastActiveDate) {
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { streakDays: 1, lastActiveDate: today },
    });
    return 1;
  }

  const last = new Date(student.lastActiveDate);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return student.streakDays;

  const newStreak = diffDays === 1 ? student.streakDays + 1 : 1;
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: { streakDays: newStreak, lastActiveDate: today },
  });

  if (newStreak > 0 && newStreak % 7 === 0) {
    await prisma.achievement.create({
      data: {
        studentId,
        type: "STREAK",
        title: `${newStreak}-Day Streak!`,
        description: "Consistent daily practice pays off!",
      },
    });
  }

  return newStreak;
}
