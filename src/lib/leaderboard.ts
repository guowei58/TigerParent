import { prisma } from "./db";
import { getWeeklyReport } from "./analytics";
import { xpLevel } from "./rewards";

export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  displayName: string;
  schoolGrade: number;
  xp: number;
  level: number;
  streakDays: number;
  masteredCount: number;
  overallAccuracy: number;
  medianSeconds: number;
  monthsAhead: number;
  weekMinutes: number;
  compositeScore: number;
  isCurrentUser: boolean;
};

function computeCompositeScore(input: {
  schoolGrade: number;
  monthsAhead: number;
  xp: number;
  streakDays: number;
  masteredCount: number;
  overallAccuracy: number;
  medianSeconds: number;
  weekMinutes: number;
}) {
  const gradeScore = input.schoolGrade * 8 + input.monthsAhead * 25;
  const xpScore = Math.min(input.xp / 4, 250);
  const streakScore = input.streakDays * 4;
  const masteryScore = input.masteredCount * 10;
  const accuracyScore = input.overallAccuracy * 180;
  const speedScore = Math.max(0, 90 - input.medianSeconds) * 2;
  const practiceScore = Math.min(input.weekMinutes, 180) * 0.6;

  return Math.round(
    gradeScore +
      xpScore +
      streakScore +
      masteryScore +
      accuracyScore +
      speedScore +
      practiceScore,
  );
}

export async function getTigerParentLeaderboard(
  currentStudentId?: string,
): Promise<LeaderboardEntry[]> {
  const students = await prisma.studentProfile.findMany({
    where: { activeStatus: true },
    include: {
      placements: true,
      mastery: { where: { status: "MASTERED" } },
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { isCorrect: true, elapsedSeconds: true },
      },
    },
    orderBy: { xp: "desc" },
  });

  const weeklyReports = await Promise.all(
    students.map((s) => getWeeklyReport(s.id)),
  );

  const scored = students.map((student, index) => {
    const attempts = student.attempts;
    const overallAccuracy =
      attempts.length > 0
        ? attempts.filter((a) => a.isCorrect).length / attempts.length
        : 0;

    const times = attempts.map((a) => a.elapsedSeconds).sort((a, b) => a - b);
    const medianSeconds =
      times.length === 0
        ? 0
        : times.length % 2 === 1
          ? times[Math.floor(times.length / 2)]
          : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;

    const monthsAhead =
      student.placements.length > 0
        ? student.placements.reduce((sum, p) => sum + p.monthsAheadOrBehind, 0) /
          student.placements.length
        : 0;

    const weekMinutes = weeklyReports[index]?.totalMinutes ?? 0;

    const compositeScore = computeCompositeScore({
      schoolGrade: student.schoolGrade,
      monthsAhead,
      xp: student.xp,
      streakDays: student.streakDays,
      masteredCount: student.mastery.length,
      overallAccuracy,
      medianSeconds,
      weekMinutes,
    });

    return {
      studentId: student.id,
      displayName: student.displayName,
      schoolGrade: student.schoolGrade,
      xp: student.xp,
      level: xpLevel(student.xp),
      streakDays: student.streakDays,
      masteredCount: student.mastery.length,
      overallAccuracy,
      medianSeconds,
      monthsAhead,
      weekMinutes,
      compositeScore,
      isCurrentUser: student.id === currentStudentId,
    };
  });

  scored.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    if (b.xp !== a.xp) return b.xp - a.xp;
    return a.displayName.localeCompare(b.displayName);
  });

  return scored.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export async function getActiveRewardGoals(studentId: string) {
  return prisma.studentRewardGoal.findMany({
    where: { studentId, active: true, redeemed: false },
    orderBy: [{ goalType: "asc" }, { streakDays: "asc" }, { xpRequired: "asc" }],
  });
}

/** @deprecated use getActiveRewardGoals */
export async function getActiveRewardGoal(studentId: string) {
  const goals = await getActiveRewardGoals(studentId);
  return goals[0] ?? null;
}

export async function getStudentRewardGoals(studentId: string) {
  return prisma.studentRewardGoal.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
