import { prisma } from "./db";
import { resolveAttemptWorkQuality } from "@/components/WorkQualityBadge";
import type { PracticeSession, Prisma } from "@/generated/prisma/client";
import {
  formatDisplayDate,
  formatPercent,
  localDateKey,
  parseLocalDateKey,
  todayDateKey,
} from "./utils";

const dailyAttemptInclude = {
  problem: { include: { skill: { include: { subject: true } } } },
  strokes: true,
} as const;

export type DailyWorkAttempt = Prisma.AttemptGetPayload<{
  include: typeof dailyAttemptInclude;
}>;

export type WeaknessArea = {
  skillId: string;
  skillTitle: string;
  subjectName: string;
  severity: number;
  accuracy: number;
  medianSeconds: number;
  overdueReview: boolean;
};

export async function getStudentAnalytics(studentId: string) {
  const [student, mastery, sessions, attempts, achievements] = await Promise.all([
    prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: {
        placements: {
          include: { subject: true, currentSkill: true, currentLevel: true },
        },
      },
    }),
    prisma.masteryState.findMany({
      where: { studentId },
      include: { skill: { include: { subject: true } } },
    }),
    prisma.practiceSession.findMany({
      where: { studentId },
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
    prisma.attempt.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.achievement.findMany({
      where: { studentId },
      orderBy: { earnedAt: "desc" },
      take: 10,
    }),
  ]);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekSessions = sessions.filter((s) => s.startedAt >= weekAgo);
  const weekMinutes = weekSessions.reduce((s, sess) => s + sess.activeSeconds, 0) / 60;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthSessions = sessions.filter((s) => s.startedAt >= monthStart);
  const monthMinutes = monthSessions.reduce((s, sess) => s + sess.activeSeconds, 0) / 60;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCompleted = sessions.some(
    (s) => s.sessionType === "DAILY_MISSION" && s.completed && s.startedAt >= todayStart,
  );

  const overallAccuracy =
    attempts.length > 0
      ? attempts.filter((a) => a.isCorrect).length / attempts.length
      : 0;

  const times = attempts.map((a) => a.elapsedSeconds).sort((a, b) => a - b);
  const medianTime =
    times.length === 0
      ? 0
      : times.length % 2 === 1
        ? times[Math.floor(times.length / 2)]
        : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;

  const masteredCount = mastery.filter((m) => m.status === "MASTERED").length;
  const struggling = mastery.filter(
    (m) => m.accuracy < 0.7 && m.attemptsCount >= 5,
  );

  const weaknesses = await getWeaknessRanking(studentId);

  return {
    student,
    weekMinutes,
    monthMinutes,
    todayCompleted,
    overallAccuracy,
    medianTime,
    masteredCount,
    struggling,
    weaknesses,
    recentSessions: sessions.slice(0, 7),
    achievements,
    placements: student.placements,
  };
}

export async function getWeaknessRanking(studentId: string): Promise<WeaknessArea[]> {
  const mastery = await prisma.masteryState.findMany({
    where: { studentId, attemptsCount: { gt: 0 } },
    include: { skill: { include: { subject: true } } },
  });

  const overdueReviews = await prisma.reviewQueueItem.findMany({
    where: {
      studentId,
      completed: false,
      dueAt: { lt: new Date() },
    },
  });
  const overdueSkillIds = new Set(overdueReviews.map((r) => r.skillId));

  const areas: WeaknessArea[] = mastery.map((m) => {
    const lowAccuracyWeight = m.accuracy < 0.7 ? (0.7 - m.accuracy) * 100 : 0;
    const slowSpeedWeight =
      m.medianSeconds > m.skill.targetMedianSeconds
        ? Math.min((m.medianSeconds - m.skill.targetMedianSeconds) / 10, 30)
        : 0;
    const repeatedMistakeWeight =
      m.attemptsCount > 0
        ? ((m.attemptsCount - m.correctCount) / m.attemptsCount) * 40
        : 0;
    const overdueReviewWeight = overdueSkillIds.has(m.skillId) ? 25 : 0;

    return {
      skillId: m.skillId,
      skillTitle: m.skill.title,
      subjectName: m.skill.subject.name,
      severity:
        lowAccuracyWeight +
        slowSpeedWeight +
        repeatedMistakeWeight +
        overdueReviewWeight,
      accuracy: m.accuracy,
      medianSeconds: m.medianSeconds,
      overdueReview: overdueSkillIds.has(m.skillId),
    };
  });

  return areas.sort((a, b) => b.severity - a.severity).slice(0, 5);
}

export async function getFamilyStudents(familyId: string) {
  return prisma.studentProfile.findMany({
    where: { familyId, activeStatus: true },
    include: {
      user: true,
      placements: { include: { subject: true, currentSkill: true } },
    },
    orderBy: { displayName: "asc" },
  });
}

export async function getWeeklyReport(studentId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.practiceSession.findMany({
    where: { studentId, startedAt: { gte: weekAgo } },
  });
  const attempts = await prisma.attempt.findMany({
    where: { studentId, createdAt: { gte: weekAgo } },
  });

  const daysActive = new Set(
    sessions.map((s) => s.startedAt.toISOString().slice(0, 10)),
  ).size;

  return {
    sessionsCompleted: sessions.filter((s) => s.completed).length,
    totalMinutes: sessions.reduce((s, sess) => s + sess.activeSeconds, 0) / 60,
    problemsAttempted: attempts.length,
    accuracy:
      attempts.length > 0
        ? attempts.filter((a) => a.isCorrect).length / attempts.length
        : 0,
    daysActive,
    consistencyScore: daysActive / 7,
  };
}

export async function getTodayActiveMinutes(studentId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sessions = await prisma.practiceSession.findMany({
    where: { studentId, startedAt: { gte: todayStart } },
  });
  return sessions.reduce((sum, sess) => sum + sess.activeSeconds, 0) / 60;
}

export type DailySkillSummary = {
  skillId: string;
  title: string;
  subjectName: string;
  correct: number;
  total: number;
};

export type DailyWorkSummary = {
  dateKey: string;
  displayDate: string;
  sessions: PracticeSession[];
  attempts: DailyWorkAttempt[];
  totalMinutes: number;
  problemsAttempted: number;
  problemsCorrect: number;
  accuracy: number | null;
  missionComplete: boolean;
  sessionsCompleted: number;
  skillsWorked: DailySkillSummary[];
  scratchWorkShowed: number;
  scratchWorkRequiredMissing: number;
  narrative: string;
};

function dayRange(dateKey: string) {
  const dayStart = parseLocalDateKey(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

export async function getStudentActiveDates(
  studentId: string,
  daysBack = 90,
): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  since.setHours(0, 0, 0, 0);

  const attempts = await prisma.attempt.findMany({
    where: { studentId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const keys = new Set<string>();
  for (const attempt of attempts) {
    keys.add(localDateKey(attempt.createdAt));
  }
  return [...keys].sort().reverse();
}

export async function getStudentDailyWork(
  studentId: string,
  dateKey?: string,
): Promise<DailyWorkSummary> {
  const resolvedDateKey = dateKey ?? todayDateKey();
  const { dayStart, dayEnd } = dayRange(resolvedDateKey);

  const [sessions, attempts, student] = await Promise.all([
    prisma.practiceSession.findMany({
      where: { studentId, startedAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.attempt.findMany({
      where: { studentId, createdAt: { gte: dayStart, lt: dayEnd } },
      include: dailyAttemptInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      select: { displayName: true, dailyGoalMinutes: true },
    }),
  ]);

  const totalSeconds = sessions.reduce((sum, s) => sum + s.activeSeconds, 0);
  const problemsCorrect = attempts.filter((a) => a.isCorrect).length;
  const accuracy =
    attempts.length > 0 ? problemsCorrect / attempts.length : null;
  const missionComplete = sessions.some(
    (s) => s.sessionType === "DAILY_MISSION" && s.completed,
  );

  const skillMap = new Map<string, DailySkillSummary>();
  for (const attempt of attempts) {
    const skill = attempt.problem.skill;
    const existing = skillMap.get(skill.id) ?? {
      skillId: skill.id,
      title: skill.title,
      subjectName: skill.subject.name,
      correct: 0,
      total: 0,
    };
    existing.total += 1;
    if (attempt.isCorrect) existing.correct += 1;
    skillMap.set(skill.id, existing);
  }

  let scratchWorkShowed = 0;
  let scratchWorkRequiredMissing = 0;
  for (const attempt of attempts) {
    const quality = resolveAttemptWorkQuality(attempt);
    if (quality.showedWork) scratchWorkShowed += 1;
    if (attempt.problem.requiresScratchpad && !quality.showedWork) {
      scratchWorkRequiredMissing += 1;
    }
  }

  const skillsWorked = [...skillMap.values()].sort(
    (a, b) => b.total - a.total,
  );
  const displayDate = formatDisplayDate(resolvedDateKey);
  const totalMinutes = totalSeconds / 60;
  const narrative = buildDailyNarrative({
    displayName: student.displayName,
    displayDate,
    totalMinutes,
    dailyGoalMinutes: student.dailyGoalMinutes,
    problemsAttempted: attempts.length,
    problemsCorrect,
    accuracy,
    missionComplete,
    sessionsCompleted: sessions.filter((s) => s.completed).length,
    skillsWorked,
    scratchWorkShowed,
    scratchWorkRequiredMissing,
  });

  return {
    dateKey: resolvedDateKey,
    displayDate,
    sessions,
    attempts,
    totalMinutes,
    problemsAttempted: attempts.length,
    problemsCorrect,
    accuracy,
    missionComplete,
    sessionsCompleted: sessions.filter((s) => s.completed).length,
    skillsWorked,
    scratchWorkShowed,
    scratchWorkRequiredMissing,
    narrative,
  };
}

function buildDailyNarrative(input: {
  displayName: string;
  displayDate: string;
  totalMinutes: number;
  dailyGoalMinutes: number;
  problemsAttempted: number;
  problemsCorrect: number;
  accuracy: number | null;
  missionComplete: boolean;
  sessionsCompleted: number;
  skillsWorked: DailySkillSummary[];
  scratchWorkShowed: number;
  scratchWorkRequiredMissing: number;
}) {
  if (
    input.problemsAttempted === 0 &&
    input.sessionsCompleted === 0 &&
    input.totalMinutes === 0
  ) {
    return `${input.displayName} did not practice on ${input.displayDate}.`;
  }

  const parts: string[] = [];
  parts.push(
    `On ${input.displayDate}, ${input.displayName} practiced for ${Math.round(input.totalMinutes)} minute${Math.round(input.totalMinutes) === 1 ? "" : "s"}`,
  );
  if (input.sessionsCompleted > 0) {
    parts.push(
      ` across ${input.sessionsCompleted} completed session${input.sessionsCompleted === 1 ? "" : "s"}`,
    );
  }
  parts.push(".");

  if (input.problemsAttempted > 0) {
    parts.push(
      ` They attempted ${input.problemsAttempted} problem${input.problemsAttempted === 1 ? "" : "s"}`,
    );
    if (input.accuracy != null) {
      parts.push(
        ` and got ${input.problemsCorrect} correct (${formatPercent(input.accuracy)} accuracy)`,
      );
    }
    parts.push(".");
  }

  if (input.missionComplete) {
    parts.push(" Daily mission was completed.");
  } else if (input.totalMinutes < input.dailyGoalMinutes) {
    parts.push(
      ` They were ${Math.max(0, Math.round(input.dailyGoalMinutes - input.totalMinutes))} minutes short of the ${input.dailyGoalMinutes}-minute daily goal.`,
    );
  }

  if (input.skillsWorked.length > 0) {
    const skillNames = input.skillsWorked
      .slice(0, 4)
      .map((s) => s.title)
      .join(", ");
    parts.push(` Skills touched: ${skillNames}.`);
  }

  if (input.scratchWorkShowed > 0) {
    parts.push(
      ` Scratch work was captured on ${input.scratchWorkShowed} problem${input.scratchWorkShowed === 1 ? "" : "s"}.`,
    );
  }
  if (input.scratchWorkRequiredMissing > 0) {
    parts.push(
      ` ${input.scratchWorkRequiredMissing} problem${input.scratchWorkRequiredMissing === 1 ? "" : "s"} required scratch work but little was shown.`,
    );
  }

  return parts.join("");
}

export async function getStudentAttemptDetail(
  studentId: string,
  attemptId: string,
) {
  return prisma.attempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      problem: { include: { skill: { include: { subject: true } } } },
      strokes: true,
      student: true,
      session: true,
    },
  });
}

export async function getStudentParentFeedback(studentId: string) {
  const [analytics, weeklyReport, todayMinutes, recentAttempts, reviewDue] =
    await Promise.all([
      getStudentAnalytics(studentId),
      getWeeklyReport(studentId),
      getTodayActiveMinutes(studentId),
      prisma.attempt.findMany({
        where: { studentId },
        include: {
          problem: { include: { skill: { include: { subject: true } } } },
          strokes: true,
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.reviewQueueItem.count({
        where: { studentId, completed: false, dueAt: { lte: new Date() } },
      }),
    ]);

  return {
    analytics,
    weeklyReport,
    todayMinutes,
    recentAttempts,
    reviewDue,
  };
}
