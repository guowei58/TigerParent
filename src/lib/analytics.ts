import { prisma } from "./db";
import { resolveAttemptWorkQuality } from "@/components/WorkQualityBadge";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { isElaReadingProblem } from "@/lib/pdf/elaDisplay";
import { passageViewFromDb, type PdfPassageView } from "@/lib/pdf/passageView";
import { formatPracticeSubjectLabel } from "@/lib/pdf-practice/selection";
import {
  PDF_PRACTICE_REQUIRES_SCRATCHPAD,
  resolvePdfAttemptWorkQuality,
} from "@/lib/pdf-practice/attempt-strokes";
import {
  countPdfTopicSessions,
  estimatePdfPracticeSeconds,
} from "@/lib/pdf-practice/session-metrics";
import {
  countUniqueProblemsFromAttempts,
  resolveProblemProgressForReporting,
} from "@/lib/pdf-practice/progress-shared";
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
  const [attempts, pdfAttempts] = await Promise.all([
    prisma.attempt.findMany({
      where: { studentId, createdAt: { gte: weekAgo } },
      select: { problemId: true, isCorrect: true },
    }),
    prisma.pdfProblemAttempt.findMany({
      where: { studentProfileId: studentId, createdAt: { gte: weekAgo } },
      select: { problemId: true, isCorrect: true, skipped: true },
    }),
  ]);

  const legacyStats = countUniqueProblemsFromAttempts(
    attempts.map((a) => ({
      problemId: a.problemId,
      isCorrect: a.isCorrect,
      skipped: false,
    })),
  );
  const pdfStats = countUniqueProblemsFromAttempts(pdfAttempts);
  const problemsAttempted = legacyStats.attempted + pdfStats.attempted;
  const problemsCorrect = legacyStats.correct + pdfStats.correct;

  const daysActive = new Set(
    sessions.map((s) => s.startedAt.toISOString().slice(0, 10)),
  ).size;

  return {
    sessionsCompleted: sessions.filter((s) => s.completed).length,
    totalMinutes: sessions.reduce((s, sess) => s + sess.activeSeconds, 0) / 60,
    problemsAttempted,
    accuracy: problemsAttempted > 0 ? problemsCorrect / problemsAttempted : 0,
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

export type DailyTopicSummary = {
  conceptId: string;
  title: string;
  subjectLabel: string;
  correct: number;
  total: number;
};

export type DailyPdfWorkAttempt = {
  id: string;
  createdAt: Date;
  isCorrect: boolean | null;
  skipped: boolean;
  selectedChoiceLabel: string | null;
  freeResponseText: string | null;
  timeSpentSeconds: number | null;
  showedWork: boolean | null;
  problemId: string;
  topicTitle: string;
  subjectLabel: string;
  topicSlug: string | null;
  imageUrl: string | null;
  passageId: string | null;
  passageTitle: string | null;
  passage: PdfPassageView | null;
  isElaReading: boolean;
  strokes: { strokeDataJson: unknown; drawingSeconds: number | null } | null;
};

export type DailyWorkSummary = {
  dateKey: string;
  displayDate: string;
  sessions: PracticeSession[];
  attempts: DailyWorkAttempt[];
  pdfAttempts: DailyPdfWorkAttempt[];
  totalMinutes: number;
  problemsAttempted: number;
  problemsCorrect: number;
  accuracy: number | null;
  missionComplete: boolean;
  sessionsCompleted: number;
  sessionCount: number;
  pdfTopicSessionCount: number;
  skillsWorked: DailySkillSummary[];
  topicsWorked: DailyTopicSummary[];
  scratchWorkShowed: number;
  scratchWorkRequiredMissing: number;
  narrative: string;
};

export function formatPdfAttemptAnswer(attempt: DailyPdfWorkAttempt): string {
  if (attempt.skipped) return "Skipped";
  if (attempt.selectedChoiceLabel) return `Choice ${attempt.selectedChoiceLabel}`;
  if (attempt.freeResponseText?.trim()) return attempt.freeResponseText.trim();
  return "—";
}

export function pdfAttemptStatusLabel(attempt: DailyPdfWorkAttempt): string {
  if (attempt.skipped) return "Skipped";
  if (attempt.isCorrect === true) return "Correct";
  if (attempt.isCorrect === false) return "Incorrect";
  return "Attempted";
}

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

  const [attempts, pdfAttempts, passageRecordings] = await Promise.all([
    prisma.attempt.findMany({
      where: { studentId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pdfProblemAttempt.findMany({
      where: { studentProfileId: studentId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.passageReadingRecording.findMany({
      where: { studentProfileId: studentId, updatedAt: { gte: since } },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const keys = new Set<string>();
  for (const attempt of attempts) {
    keys.add(localDateKey(attempt.createdAt));
  }
  for (const attempt of pdfAttempts) {
    keys.add(localDateKey(attempt.createdAt));
  }
  for (const recording of passageRecordings) {
    keys.add(localDateKey(recording.updatedAt));
  }
  return [...keys].sort().reverse();
}

export async function getStudentDailyWork(
  studentId: string,
  dateKey?: string,
): Promise<DailyWorkSummary> {
  const resolvedDateKey = dateKey ?? todayDateKey();
  const { dayStart, dayEnd } = dayRange(resolvedDateKey);

  const [sessions, attempts, pdfAttemptsRaw, student] = await Promise.all([
    prisma.practiceSession.findMany({
      where: { studentId, startedAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.attempt.findMany({
      where: { studentId, createdAt: { gte: dayStart, lt: dayEnd } },
      include: dailyAttemptInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.pdfProblemAttempt.findMany({
      where: { studentProfileId: studentId, createdAt: { gte: dayStart, lt: dayEnd } },
      include: {
        strokes: true,
        problem: {
          include: {
            primaryConcept: true,
            passage: {
              select: {
                id: true,
                title: true,
                promptText: true,
                bodyText: true,
                pageImagePaths: true,
                passageNumber: true,
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      select: { displayName: true, dailyGoalMinutes: true },
    }),
  ]);

  const pdfAttempts: DailyPdfWorkAttempt[] = pdfAttemptsRaw.map((row) => {
    const concept = row.problem.primaryConcept;
    const topicTitle =
      concept?.name ?? row.problem.topic ?? `Problem ${row.problem.problemNumber}`;
    const subjectLabel = concept
      ? formatPracticeSubjectLabel(concept.subject)
      : row.problem.subject
        ? formatPracticeSubjectLabel(row.problem.subject)
        : "Practice";
    const passage = row.problem.passage;
    const passageTitle = passage
      ? passage.title?.trim() ||
        passage.promptText?.trim().slice(0, 80) ||
        `Passage ${passage.passageNumber}`
      : null;
    const passageView = passage ? passageViewFromDb(passage) : null;
    return {
      id: row.id,
      createdAt: row.createdAt,
      isCorrect: row.isCorrect,
      skipped: row.skipped,
      selectedChoiceLabel: row.selectedChoiceLabel,
      freeResponseText: row.freeResponseText,
      timeSpentSeconds: row.timeSpentSeconds,
      showedWork: row.showedWork,
      problemId: row.problemId,
      topicTitle,
      subjectLabel,
      topicSlug: concept?.slug ?? null,
      imageUrl: assetUrl(problemDisplayImagePath(row.problem)),
      passageId: row.problem.passageId,
      passageTitle,
      passage: passageView,
      isElaReading: isElaReadingProblem({
        subject: row.problem.subject,
        passageId: row.problem.passageId,
        passage: passageView,
      }),
      strokes: row.strokes
        ? {
            strokeDataJson: row.strokes.strokeDataJson,
            drawingSeconds: row.strokes.drawingSeconds,
          }
        : null,
    };
  });

  const sessionIdsWithAttempts = new Set(attempts.map((a) => a.sessionId));
  const visibleSessions = sessions.filter(
    (s) =>
      s.completed || s.activeSeconds > 0 || sessionIdsWithAttempts.has(s.id),
  );

  const pdfSeconds = estimatePdfPracticeSeconds(
    pdfAttempts.map((a) => ({
      createdAt: a.createdAt,
      timeSpentSeconds: a.timeSpentSeconds,
    })),
  );
  const pdfTopicSessionCount = countPdfTopicSessions(
    pdfAttemptsRaw.map((row) => ({
      createdAt: row.createdAt,
      conceptId: row.problem.primaryConcept?.id ?? null,
    })),
  );
  const legacySessionCount = visibleSessions.length;
  const sessionCount = legacySessionCount + pdfTopicSessionCount;
  const totalSeconds =
    sessions.reduce((sum, s) => sum + s.activeSeconds, 0) + pdfSeconds;
  const legacyProblemStats = countUniqueProblemsFromAttempts(
    attempts.map((a) => ({
      problemId: a.problemId,
      isCorrect: a.isCorrect,
      skipped: false,
    })),
  );
  const pdfProblemStats = countUniqueProblemsFromAttempts(
    pdfAttempts.map((a) => ({
      problemId: a.problemId,
      isCorrect: a.isCorrect,
      skipped: a.skipped,
    })),
  );
  const problemsCorrect = legacyProblemStats.correct + pdfProblemStats.correct;
  const problemsAttempted =
    legacyProblemStats.attempted + pdfProblemStats.attempted;
  const accuracy =
    problemsAttempted > 0 ? problemsCorrect / problemsAttempted : null;
  const missionComplete = sessions.some(
    (s) => s.sessionType === "DAILY_MISSION" && s.completed,
  );

  const skillMap = new Map<string, DailySkillSummary>();
  const legacyAttemptsByProblem = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const list = legacyAttemptsByProblem.get(attempt.problemId) ?? [];
    list.push(attempt);
    legacyAttemptsByProblem.set(attempt.problemId, list);
  }
  for (const problemAttempts of legacyAttemptsByProblem.values()) {
    const skill = problemAttempts[0]!.problem.skill;
    const status = resolveProblemProgressForReporting(
      problemAttempts.map((a) => ({ isCorrect: a.isCorrect, skipped: false })),
    );
    if (!status) continue;
    const existing = skillMap.get(skill.id) ?? {
      skillId: skill.id,
      title: skill.title,
      subjectName: skill.subject.name,
      correct: 0,
      total: 0,
    };
    existing.total += 1;
    if (status === "correct") existing.correct += 1;
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
  for (const row of pdfAttemptsRaw) {
    const quality = resolvePdfAttemptWorkQuality(row);
    if (quality.showedWork) scratchWorkShowed += 1;
    if (PDF_PRACTICE_REQUIRES_SCRATCHPAD && !quality.showedWork) {
      scratchWorkRequiredMissing += 1;
    }
  }

  const skillsWorked = [...skillMap.values()].sort(
    (a, b) => b.total - a.total,
  );

  const topicMap = new Map<string, DailyTopicSummary>();
  const pdfAttemptsByProblem = new Map<string, typeof pdfAttemptsRaw>();
  for (const row of pdfAttemptsRaw) {
    const list = pdfAttemptsByProblem.get(row.problemId) ?? [];
    list.push(row);
    pdfAttemptsByProblem.set(row.problemId, list);
  }
  for (const problemAttempts of pdfAttemptsByProblem.values()) {
    const row = problemAttempts[0]!;
    const concept = row.problem.primaryConcept;
    const key = concept?.id ?? row.problemId;
    const title =
      concept?.name ?? row.problem.topic ?? `Problem ${row.problem.problemNumber}`;
    const subjectLabel = concept
      ? formatPracticeSubjectLabel(concept.subject)
      : row.problem.subject
        ? formatPracticeSubjectLabel(row.problem.subject)
        : "Practice";
    const status = resolveProblemProgressForReporting(
      problemAttempts.map((a) => ({
        isCorrect: a.isCorrect,
        skipped: a.skipped,
      })),
    );
    if (!status) continue;
    const existing = topicMap.get(key) ?? {
      conceptId: key,
      title,
      subjectLabel,
      correct: 0,
      total: 0,
    };
    existing.total += 1;
    if (status === "correct") existing.correct += 1;
    topicMap.set(key, existing);
  }

  const topicsWorked = [...topicMap.values()].sort((a, b) => b.total - a.total);
  const displayDate = formatDisplayDate(resolvedDateKey);
  const totalMinutes = totalSeconds / 60;
  const narrative = buildDailyNarrative({
    displayName: student.displayName,
    displayDate,
    totalMinutes,
    dailyGoalMinutes: student.dailyGoalMinutes,
    problemsAttempted,
    problemsCorrect,
    accuracy,
    missionComplete,
    sessionsCompleted:
      visibleSessions.filter((s) => s.completed).length + pdfTopicSessionCount,
    skillsWorked,
    topicsWorked,
    scratchWorkShowed,
    scratchWorkRequiredMissing,
  });

  return {
    dateKey: resolvedDateKey,
    displayDate,
    sessions: visibleSessions,
    attempts,
    pdfAttempts,
    totalMinutes,
    problemsAttempted,
    problemsCorrect,
    accuracy,
    missionComplete,
    sessionsCompleted:
      visibleSessions.filter((s) => s.completed).length + pdfTopicSessionCount,
    sessionCount,
    pdfTopicSessionCount,
    skillsWorked,
    topicsWorked,
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
  topicsWorked: DailyTopicSummary[];
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

  if (input.topicsWorked.length > 0) {
    const topicNames = input.topicsWorked
      .slice(0, 4)
      .map((t) => t.title)
      .join(", ");
    parts.push(` Topics: ${topicNames}.`);
  } else if (input.skillsWorked.length > 0) {
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

export async function getStudentPdfAttemptDetail(
  studentId: string,
  attemptId: string,
) {
  const row = await prisma.pdfProblemAttempt.findFirst({
    where: { id: attemptId, studentProfileId: studentId },
    include: {
      strokes: true,
      problem: { include: { primaryConcept: true } },
    },
  });
  if (!row) return null;

  const concept = row.problem.primaryConcept;
  const topicTitle =
    concept?.name ?? row.problem.topic ?? `Problem ${row.problem.problemNumber}`;
  const subjectLabel = concept
    ? formatPracticeSubjectLabel(concept.subject)
    : row.problem.subject
      ? formatPracticeSubjectLabel(row.problem.subject)
      : "Practice";

  return {
    id: row.id,
    createdAt: row.createdAt,
    isCorrect: row.isCorrect,
    skipped: row.skipped,
    selectedChoiceLabel: row.selectedChoiceLabel,
    freeResponseText: row.freeResponseText,
    timeSpentSeconds: row.timeSpentSeconds,
    showedWork: row.showedWork,
    topicTitle,
    subjectLabel,
    topicSlug: concept?.slug ?? null,
    imageUrl: assetUrl(problemDisplayImagePath(row.problem)),
    strokes: row.strokes,
    workQuality: resolvePdfAttemptWorkQuality(row),
  };
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
