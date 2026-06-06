import { prisma } from "@/lib/db";
import {
  resolveProblemProgressFromAttempts,
  type PdfProblemProgressStatus,
} from "@/lib/pdf-practice/progress-shared";
import { PDF_SESSION_GAP_MS } from "@/lib/pdf-practice/session-metrics";

export type RecentPracticeSummary = {
  id: string;
  completedAt: Date;
  subjectName: string;
  label: string;
  sourceLabel: string;
  doneCount: number;
  correctCount: number;
  wrongOrSkippedCount: number;
};

function subjectKeyFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("english") || lower.includes("ela") || lower.includes("reading")) {
    return "english";
  }
  return "math";
}

function conceptMatchesSubject(conceptSubject: string, subjectKey: string): boolean {
  const c = conceptSubject.toLowerCase();
  if (subjectKey === "english") {
    return c.includes("english") || c.includes("ela") || c.includes("reading");
  }
  return c.includes("math");
}

function summarizePdfStatuses(statuses: (PdfProblemProgressStatus | null)[]) {
  let correctCount = 0;
  let wrongOrSkippedCount = 0;

  for (const status of statuses) {
    if (!status) continue;
    if (status === "correct") correctCount++;
    else if (status === "submitted") wrongOrSkippedCount++;
    else wrongOrSkippedCount++;
  }

  return {
    doneCount: correctCount + wrongOrSkippedCount,
    correctCount,
    wrongOrSkippedCount,
  };
}

async function legacySummariesForSubject(
  studentId: string,
  subjectId: string,
  subjectName: string,
  limit: number,
): Promise<RecentPracticeSummary[]> {
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      sessionType: "PRACTICE",
      totalProblems: { gt: 0 },
    },
    orderBy: { startedAt: "desc" },
    take: 40,
    include: {
      attempts: {
        select: {
          isCorrect: true,
          problem: { select: { skill: { select: { subjectId: true, title: true } } } },
        },
      },
    },
  });

  const skillTitles = new Map<string, string>();
  const summaries: RecentPracticeSummary[] = [];

  for (const s of sessions) {
    const subjectAttempts = s.attempts.filter((a) => a.problem.skill.subjectId === subjectId);
    if (subjectAttempts.length === 0) continue;

    const phase = (s.phaseJson ?? {}) as { primarySkillId?: string };
    let label = "Lesson practice";
    if (phase.primarySkillId) {
      if (!skillTitles.has(phase.primarySkillId)) {
        const skill = await prisma.skill.findUnique({
          where: { id: phase.primarySkillId },
          select: { title: true },
        });
        if (skill) skillTitles.set(phase.primarySkillId, skill.title);
      }
      label = skillTitles.get(phase.primarySkillId) ?? label;
    } else {
      const skillTitle = subjectAttempts[0]?.problem.skill.title;
      if (skillTitle) label = skillTitle;
    }

    const correctCount = subjectAttempts.filter((a) => a.isCorrect).length;
    const doneCount = subjectAttempts.length;

    summaries.push({
      id: `legacy-${s.id}`,
      completedAt: s.endedAt ?? s.startedAt,
      subjectName,
      label,
      sourceLabel: "Lesson bank",
      doneCount,
      correctCount,
      wrongOrSkippedCount: doneCount - correctCount,
    });

    if (summaries.length >= limit) break;
  }

  return summaries;
}

async function pdfSummariesForSubject(
  studentId: string,
  subjectKey: string,
  subjectName: string,
  limit: number,
): Promise<RecentPracticeSummary[]> {
  const attempts = await prisma.pdfProblemAttempt.findMany({
    where: { studentProfileId: studentId },
    orderBy: { createdAt: "asc" },
    take: 800,
    include: {
      problem: {
        select: {
          id: true,
          primaryConcept: { select: { id: true, name: true, subject: true } },
        },
      },
    },
  });

  type Bucket = {
    conceptId: string;
    label: string;
    startedAt: Date;
    endedAt: Date;
    byProblem: Map<string, { isCorrect: boolean | null; skipped: boolean }[]>;
  };

  const buckets: Bucket[] = [];

  for (const att of attempts) {
    const concept = att.problem.primaryConcept;
    if (!concept || !conceptMatchesSubject(concept.subject, subjectKey)) continue;

    const last = buckets[buckets.length - 1];
    const t = att.createdAt.getTime();
    if (
      last &&
      last.conceptId === concept.id &&
      t - last.endedAt.getTime() <= PDF_SESSION_GAP_MS
    ) {
      const list = last.byProblem.get(att.problemId) ?? [];
      list.push({ isCorrect: att.isCorrect, skipped: att.skipped });
      last.byProblem.set(att.problemId, list);
      last.endedAt = att.createdAt;
    } else {
      buckets.push({
        conceptId: concept.id,
        label: concept.name,
        startedAt: att.createdAt,
        endedAt: att.createdAt,
        byProblem: new Map([
          [att.problemId, [{ isCorrect: att.isCorrect, skipped: att.skipped }]],
        ]),
      });
    }
  }

  const summaries: RecentPracticeSummary[] = [];

  for (const bucket of buckets.reverse()) {
    const statuses: (PdfProblemProgressStatus | null)[] = [];
    for (const problemAttempts of bucket.byProblem.values()) {
      statuses.push(resolveProblemProgressFromAttempts(problemAttempts));
    }
    const stats = summarizePdfStatuses(statuses);
    if (stats.doneCount === 0) continue;

    summaries.push({
      id: `pdf-${bucket.conceptId}-${bucket.endedAt.toISOString()}`,
      completedAt: bucket.endedAt,
      subjectName,
      label: bucket.label,
      sourceLabel: "Topic practice",
      ...stats,
    });

    if (summaries.length >= limit) break;
  }

  return summaries;
}

export async function getRecentPracticeSummaries(
  studentId: string,
  subjectId: string,
  subjectName: string,
  limit = 3,
): Promise<RecentPracticeSummary[]> {
  const subjectKey = subjectKeyFromName(subjectName);

  const [legacy, pdf] = await Promise.all([
    legacySummariesForSubject(studentId, subjectId, subjectName, limit),
    pdfSummariesForSubject(studentId, subjectKey, subjectName, limit),
  ]);

  return [...legacy, ...pdf]
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, limit);
}

/** Recent sessions across all subjects, newest first. */
export async function getRecentPracticeSummariesForStudent(
  studentId: string,
  limit = 12,
): Promise<RecentPracticeSummary[]> {
  const placements = await prisma.studentSubjectPlacement.findMany({
    where: {
      studentId,
      subject: { studentSubjects: { some: { studentId, enabled: true } } },
    },
    include: { subject: true },
  });

  if (placements.length === 0) return [];

  const perSubject = await Promise.all(
    placements.map((p) =>
      getRecentPracticeSummaries(studentId, p.subjectId, p.subject.name, limit),
    ),
  );

  return perSubject
    .flat()
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, limit);
}

export function groupRecentPracticesByDate(
  practices: RecentPracticeSummary[],
): { dateKey: string; heading: string; items: RecentPracticeSummary[] }[] {
  const groups = new Map<string, RecentPracticeSummary[]>();

  for (const practice of practices) {
    const key = practice.completedAt.toISOString().slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(practice);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => ({
      dateKey,
      heading: formatPracticeDateHeading(items[0]!.completedAt),
      items: items.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime()),
    }));
}

function formatPracticeDateHeading(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
