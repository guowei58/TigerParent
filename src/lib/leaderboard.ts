import { prisma } from "./db";

export type StudentProblemStats = {
  problemsDone: number;
  problemsCorrect: number;
  accuracy: number;
};

export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  displayName: string;
  schoolGrade: number;
  problemsCorrect: number;
  problemsDone: number;
  accuracy: number;
  isCurrentUser: boolean;
};

export async function getStudentProblemStats(
  studentId: string,
): Promise<StudentProblemStats> {
  const map = await getProblemStatsForStudents([studentId]);
  return map.get(studentId) ?? { problemsDone: 0, problemsCorrect: 0, accuracy: 0 };
}

export async function getProblemStatsForStudents(
  studentIds: string[],
): Promise<Map<string, StudentProblemStats>> {
  const stats = new Map<string, StudentProblemStats>();
  if (studentIds.length === 0) return stats;

  const attempts = await prisma.pdfProblemAttempt.findMany({
    where: { studentProfileId: { in: studentIds }, skipped: false },
    select: { studentProfileId: true, isCorrect: true },
  });

  for (const id of studentIds) {
    stats.set(id, { problemsDone: 0, problemsCorrect: 0, accuracy: 0 });
  }

  for (const attempt of attempts) {
    if (!attempt.studentProfileId) continue;
    const entry = stats.get(attempt.studentProfileId)!;
    entry.problemsDone += 1;
    if (attempt.isCorrect === true) entry.problemsCorrect += 1;
  }

  for (const entry of stats.values()) {
    entry.accuracy =
      entry.problemsDone > 0 ? entry.problemsCorrect / entry.problemsDone : 0;
  }

  return stats;
}

export async function getTigerParentLeaderboard(
  currentStudentId?: string,
): Promise<LeaderboardEntry[]> {
  const students = await prisma.studentProfile.findMany({
    where: { activeStatus: true },
    select: { id: true, displayName: true, schoolGrade: true },
    orderBy: { displayName: "asc" },
  });

  const statsMap = await getProblemStatsForStudents(students.map((s) => s.id));

  const scored = students.map((student) => {
    const stats = statsMap.get(student.id)!;
    return {
      studentId: student.id,
      displayName: student.displayName,
      schoolGrade: student.schoolGrade,
      problemsCorrect: stats.problemsCorrect,
      problemsDone: stats.problemsDone,
      accuracy: stats.accuracy,
      isCurrentUser: student.id === currentStudentId,
    };
  });

  scored.sort((a, b) => {
    if (b.problemsCorrect !== a.problemsCorrect) {
      return b.problemsCorrect - a.problemsCorrect;
    }
    if (b.problemsDone !== a.problemsDone) return b.problemsDone - a.problemsDone;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
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
