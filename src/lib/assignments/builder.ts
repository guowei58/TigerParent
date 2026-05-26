import type {
  AssignmentType,
  ContentStrictnessMode,
  ProblemUsageType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  loadProblemsByIds,
  recordProblemExposures,
  selectFreshProblemIdsForStudent,
} from "@/lib/problem-selection";
import { getDueReviewItems, getMistakesForReview } from "@/lib/review";
import {
  assignmentSessionType,
  computeSourceMixFromProblems,
  type SourceMix,
} from "./types";

export type BuildAssignmentOptions = {
  studentId: string;
  assignmentType: AssignmentType;
  subjectId: string;
  skillId?: string;
  gradeLevel: number;
  count: number;
  strictness?: ContentStrictnessMode;
  excludeProblemIds?: string[];
  sessionId?: string;
};

const ASSIGNMENT_DEFAULTS: Record<
  AssignmentType,
  { count: number; minutes: number; timed: boolean; timeLimitSeconds?: number }
> = {
  DRILL: { count: 5, minutes: 5, timed: true, timeLimitSeconds: 300 },
  HOMEWORK: { count: 12, minutes: 10, timed: false },
  QUIZ: { count: 10, minutes: 7, timed: true, timeLimitSeconds: 420 },
  TEST: { count: 30, minutes: 25, timed: true, timeLimitSeconds: 1500 },
  BENCHMARK: { count: 20, minutes: 20, timed: true, timeLimitSeconds: 1200 },
  RETAKE: { count: 5, minutes: 5, timed: false },
  CHALLENGE: { count: 8, minutes: 10, timed: false },
};

export function assignmentDefaults(type: AssignmentType) {
  return ASSIGNMENT_DEFAULTS[type];
}

function usageTypesForAssignment(
  type: AssignmentType,
  strictness: ContentStrictnessMode,
): ProblemUsageType[] {
  const sourceBacked: ProblemUsageType[] = [
    "OFFICIAL_RELEASED",
    "OFFICIAL_STYLE",
    "STAAR_PRACTICE",
    "SAT_PRACTICE",
    "SCHOOL_TEST_PREP",
    "CONCEPT_PRACTICE",
  ];
  const drill: ProblemUsageType[] = ["FLUENCY_DRILL", "CONCEPT_PRACTICE", "REVIEW"];
  const challenge: ProblemUsageType[] = ["CHALLENGE", "OFFICIAL_STYLE", "CONCEPT_PRACTICE"];

  if (type === "DRILL") return drill;
  if (type === "RETAKE") return ["RETAKE", "REVIEW", "CONCEPT_PRACTICE"];
  if (type === "CHALLENGE") return challenge;

  if (type === "BENCHMARK" || type === "TEST") {
    return strictness === "DRILL_MODE"
      ? [...sourceBacked, "CONCEPT_PRACTICE"]
      : sourceBacked;
  }

  if (type === "QUIZ") {
    return strictness === "STRICT_TEST"
      ? sourceBacked
      : [...sourceBacked, "CONCEPT_PRACTICE", "FLUENCY_DRILL"];
  }

  // Homework
  return strictness === "STRICT_TEST"
    ? sourceBacked
    : [...sourceBacked, "CONCEPT_PRACTICE", "FLUENCY_DRILL", "HOMEWORK"];
}

function sessionTypeForAssignment(type: AssignmentType) {
  return assignmentSessionType(type);
}

export async function buildAssignmentProblems(
  options: BuildAssignmentOptions,
): Promise<{ problemIds: string[]; sourceMix: SourceMix }> {
  const {
    studentId,
    assignmentType,
    subjectId,
    skillId,
    count,
    strictness = "BALANCED_PRACTICE",
    excludeProblemIds = [],
    sessionId,
  } = options;

  const sessionType = sessionTypeForAssignment(assignmentType);
  const usageTypes = usageTypesForAssignment(assignmentType, strictness);

  if (assignmentType === "RETAKE") {
    const mistakes = await prisma.mistakeLog.findMany({
      where: { studentId, needsRetake: true, resolvedAt: null },
      orderBy: { createdAt: "desc" },
      take: count,
      select: { problemId: true, skillId: true },
    });
    if (mistakes.length) {
      const skillIds = [...new Set(mistakes.map((m) => m.skillId).filter(Boolean))] as string[];
      const fresh = await selectFreshProblemIdsForStudent({
        studentId,
        count: Math.max(0, count - mistakes.length),
        skillIds: skillIds.length ? skillIds : undefined,
        skillId: skillIds.length ? undefined : skillId,
        excludeProblemIds: [...excludeProblemIds, ...mistakes.map((m) => m.problemId)],
        sessionType,
        sessionId,
        usageTypes: ["RETAKE", "REVIEW", "FLUENCY_DRILL", "CONCEPT_PRACTICE"],
      });
      const problemIds = [...mistakes.map((m) => m.problemId), ...fresh].slice(0, count);
      const problems = await loadProblemsByIds(problemIds);
      return { problemIds, sourceMix: computeSourceMixFromProblems(problems) };
    }
  }

  const reviewItems =
    assignmentType === "DRILL"
      ? await getDueReviewItems(studentId, 2, subjectId)
      : [];

  const reviewSkillIds = reviewItems.map((r) => r.skillId);
  const mistakeRows = assignmentType === "DRILL" ? await getMistakesForReview(studentId, 2, subjectId) : [];
  const mistakeSkillIds = [...new Set(mistakeRows.map((m) => m.problem.skillId))];

  const skillIds = [
    ...(skillId ? [skillId] : []),
    ...reviewSkillIds,
    ...mistakeSkillIds,
  ].filter(Boolean);

  const problemIds = await selectFreshProblemIdsForStudent({
    studentId,
    count,
    skillId: skillIds.length ? undefined : skillId,
    skillIds: skillIds.length ? [...new Set(skillIds)] : undefined,
    excludeProblemIds,
    sessionType,
    sessionId,
    usageTypes: usageTypes.map(String),
  });

  if (sessionId && problemIds.length) {
    await recordProblemExposures(studentId, problemIds, sessionId);
  }

  const problems = await loadProblemsByIds(problemIds);
  return { problemIds, sourceMix: computeSourceMixFromProblems(problems) };
}

export async function startAssignment(assignmentId: string, studentId: string) {
  const assignment = await prisma.assignment.findFirstOrThrow({
    where: { id: assignmentId, studentId },
    include: { session: true },
  });

  if (assignment.session?.id) {
    return assignment.session;
  }

  const defaults = assignmentDefaults(assignment.assignmentType);
  const session = await prisma.practiceSession.create({
    data: {
      studentId,
      sessionType: assignmentSessionType(assignment.assignmentType),
      assignmentId: assignment.id,
      targetMinutes: assignment.targetMinutes || defaults.minutes,
      timed: assignment.timed,
      timeLimitSeconds: assignment.timeLimitSeconds ?? defaults.timeLimitSeconds,
      skillsJson: assignment.skillIdsJson ?? [],
    },
  });

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: "IN_PROGRESS" },
  });

  return session;
}

export async function completeAssignment(assignmentId: string, studentId: string) {
  const assignment = await prisma.assignment.findFirstOrThrow({
    where: { id: assignmentId, studentId },
  });

  const session = await prisma.practiceSession.findFirst({
    where: { assignmentId: assignment.id },
    include: { attempts: true },
  });

  const attempts = session?.attempts ?? [];
  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracy = attempts.length ? correct / attempts.length : 0;
  const medianSeconds =
    attempts.length > 0
      ? attempts.map((a) => a.elapsedSeconds).sort((a, b) => a - b)[
          Math.floor(attempts.length / 2)
        ]
      : null;

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  if (session) {
    await prisma.practiceSession.update({
      where: { id: session.id },
      data: {
        completed: true,
        endedAt: new Date(),
        totalProblems: attempts.length,
        correctProblems: correct,
        accuracy,
        medianSecondsPerProblem: medianSeconds ?? undefined,
      },
    });
  }

  if (
    assignment.assignmentType === "QUIZ" ||
    assignment.assignmentType === "TEST" ||
    assignment.assignmentType === "BENCHMARK"
  ) {
    const testType =
      assignment.assignmentType === "BENCHMARK"
        ? "BENCHMARK"
        : assignment.assignmentType === "TEST"
          ? "UNIT_TEST"
          : "QUIZ";

    await prisma.testResult.create({
      data: {
        studentId,
        assignmentId: assignment.id,
        testType,
        rawScore: correct,
        percentScore: accuracy * 100,
        accuracy,
        medianSeconds: medianSeconds ?? undefined,
        sourceMixJson: assignment.sourceMixJson ?? undefined,
      },
    });
  }

  return { accuracy, correct, total: attempts.length };
}
