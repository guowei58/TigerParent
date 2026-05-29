import { prisma } from "./db";
import { displayChoicesForProblem } from "./mcq-choices";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";

const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
export const MISTAKE_REVIEW_LOOKBACK_DAYS = 7;

export type ReviewMistake = {
  id: string;
  createdAt: Date;
  problemId: string;
  skillId: string | null;
  topicLabel: string;
  prompt: string;
  userAnswer: string;
  explanation: string | null;
  imageUrl: string | null;
  practiceHref: string | null;
  source: "legacy" | "pdf";
};

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

function conceptMatchesSubjectName(conceptSubject: string, subjectName: string): boolean {
  const c = conceptSubject.toLowerCase();
  const n = subjectName.toLowerCase();
  if (n.includes("english") || n.includes("ela") || n.includes("reading")) {
    return c.includes("english") || c.includes("ela") || c.includes("reading");
  }
  if (n.includes("math")) return c.includes("math");
  return c.includes(n) || n.includes(c);
}

export function formatLegacyAttemptAnswer(
  answer: string,
  problem: {
    id: string;
    choicesJson?: unknown;
    choicesWithIdsJson?: unknown;
    correctAnswer: string;
    correctChoiceId?: string | null;
  },
): string {
  const trimmed = answer.trim();
  const choices = displayChoicesForProblem(problem);
  const byId = choices.find(
    (c) => c.id === trimmed || c.id.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byId) return byId.text;
  if (/^[A-Da-d]$/.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

function legacyAttemptToReviewMistake(
  attempt: {
    id: string;
    createdAt: Date;
    answer: string;
    problemId: string;
    problem: {
      id: string;
      prompt: string;
      explanation: string | null;
      skillId: string;
      skill: { title: string };
      choicesJson?: unknown;
      choicesWithIdsJson?: unknown;
      correctAnswer: string;
      correctChoiceId?: string | null;
    };
  },
): ReviewMistake {
  return {
    id: attempt.id,
    createdAt: attempt.createdAt,
    problemId: attempt.problemId,
    skillId: attempt.problem.skillId,
    topicLabel: attempt.problem.skill.title,
    prompt: attempt.problem.prompt,
    userAnswer: formatLegacyAttemptAnswer(attempt.answer, attempt.problem),
    explanation: attempt.problem.explanation,
    imageUrl: null,
    practiceHref: null,
    source: "legacy",
  };
}

function pdfAttemptToReviewMistake(
  attempt: {
    id: string;
    createdAt: Date;
    selectedChoiceLabel: string | null;
    freeResponseText: string | null;
    problemId: string;
    problem: {
      id: string;
      cleanedText: string | null;
      rawText: string | null;
      problemImagePath: string | null;
      fullPageImagePath: string | null;
      solution: {
        explanationStepByStep: string | null;
        childFriendlyExplanation: string | null;
        explanationShort: string | null;
        correctChoiceLabel: string | null;
        correctAnswerText: string | null;
      } | null;
      primaryConcept: { name: string; slug: string; subject: string } | null;
    };
  },
): ReviewMistake {
  const text = attempt.problem.cleanedText?.trim() || attempt.problem.rawText?.trim() || "";
  const explanation =
    attempt.problem.solution?.explanationStepByStep ??
    attempt.problem.solution?.childFriendlyExplanation ??
    attempt.problem.solution?.explanationShort ??
    null;

  let userAnswer =
    attempt.selectedChoiceLabel?.trim() ||
    attempt.freeResponseText?.trim() ||
    "—";
  if (userAnswer === "—" && attempt.problem.solution?.correctChoiceLabel) {
    userAnswer = "(no answer recorded)";
  }

  const concept = attempt.problem.primaryConcept;

  return {
    id: attempt.id,
    createdAt: attempt.createdAt,
    problemId: attempt.problemId,
    skillId: null,
    topicLabel: concept?.name ?? "PDF practice",
    prompt: text || "Open the topic to view this problem image.",
    userAnswer,
    explanation,
    imageUrl: assetUrl(problemDisplayImagePath(attempt.problem)),
    practiceHref: concept ? `/student/concepts/${concept.slug}` : null,
    source: "pdf",
  };
}

async function fetchLegacyMistakeAttempts(
  studentId: string,
  options: { subjectId?: string; dateKey?: string; since?: Date },
) {
  const dayBounds = options.dateKey ? mistakeDayBounds(options.dateKey) : null;

  return prisma.attempt.findMany({
    where: {
      studentId,
      isCorrect: false,
      ...(dayBounds
        ? { createdAt: { gte: dayBounds.start, lte: dayBounds.end } }
        : options.since
          ? { createdAt: { gte: options.since } }
          : {}),
      ...(options.subjectId ? { problem: { skill: { subjectId: options.subjectId } } } : {}),
    },
    include: {
      problem: { include: { skill: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function fetchPdfMistakeAttempts(
  studentProfileId: string,
  options: { subjectId?: string; dateKey?: string; since?: Date },
) {
  const subject = options.subjectId
    ? await prisma.subject.findUnique({
        where: { id: options.subjectId },
        select: { name: true },
      })
    : null;

  const dayBounds = options.dateKey ? mistakeDayBounds(options.dateKey) : null;

  const attempts = await prisma.pdfProblemAttempt.findMany({
    where: {
      studentProfileId,
      isCorrect: false,
      skipped: false,
      ...(dayBounds
        ? { createdAt: { gte: dayBounds.start, lte: dayBounds.end } }
        : options.since
          ? { createdAt: { gte: options.since } }
          : {}),
    },
    include: {
      problem: {
        include: {
          primaryConcept: true,
          solution: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subject) return attempts;

  return attempts.filter((attempt) => {
    const concept = attempt.problem.primaryConcept;
    if (!concept) return false;
    return conceptMatchesSubjectName(concept.subject, subject.name);
  });
}

function dedupeReviewMistakes(items: ReviewMistake[], limit: number): ReviewMistake[] {
  const seen = new Set<string>();
  const out: ReviewMistake[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.problemId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export async function getMistakesForReview(
  studentId: string,
  limit = 10,
  subjectId?: string,
  dateKey?: string,
): Promise<ReviewMistake[]> {
  const [legacyAttempts, pdfAttempts] = await Promise.all([
    fetchLegacyMistakeAttempts(studentId, { subjectId, dateKey }),
    fetchPdfMistakeAttempts(studentId, { subjectId, dateKey }),
  ]);

  const merged = [
    ...legacyAttempts.map(legacyAttemptToReviewMistake),
    ...pdfAttempts.map(pdfAttemptToReviewMistake),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return dedupeReviewMistakes(merged, limit);
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

  const [legacyAttempts, pdfAttempts, reviewedKeys] = await Promise.all([
    fetchLegacyMistakeAttempts(studentId, { subjectId, since }),
    fetchPdfMistakeAttempts(studentId, { subjectId, since }),
    getReviewedMistakeDateKeys(studentId, subjectId, since),
  ]);

  const problemsByDay = new Map<string, Set<string>>();
  for (const attempt of legacyAttempts) {
    const dateKey = toMistakeDateKey(attempt.createdAt);
    if (!problemsByDay.has(dateKey)) {
      problemsByDay.set(dateKey, new Set());
    }
    problemsByDay.get(dateKey)!.add(`legacy:${attempt.problemId}`);
  }
  for (const attempt of pdfAttempts) {
    const dateKey = toMistakeDateKey(attempt.createdAt);
    if (!problemsByDay.has(dateKey)) {
      problemsByDay.set(dateKey, new Set());
    }
    problemsByDay.get(dateKey)!.add(`pdf:${attempt.problemId}`);
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
