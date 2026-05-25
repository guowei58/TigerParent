import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkAnswer } from "@/lib/mission";
import {
  updateMasteryAfterAttempt,
  awardXp,
} from "@/lib/mastery";
import { parseStrokes } from "@/lib/strokes";
import {
  selectFreshProblemsForStudent,
  loadProblemsByIds,
  recordProblemExposures,
} from "@/lib/problem-selection";
import { assertStudentVisibleProblem } from "@/lib/problem-student-gate";
import { updateProblemPerformanceStats } from "@/lib/problem-performance-calibration";
import {
  analyzeWorkQuality,
  getWorkBonusXp,
  getWorkFeedback,
} from "@/lib/stroke-analysis";
import { pickRoastForSession } from "@/lib/roast-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const { problemId, answer, strokes, elapsedSeconds, drawingSeconds } = body;

  const practiceSession = await prisma.practiceSession.findFirst({
    where: { id: sessionId, studentId: session.user.studentProfileId },
  });
  if (!practiceSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const problem = await prisma.problem.findUniqueOrThrow({
    where: { id: problemId },
  });

  try {
    assertStudentVisibleProblem({
      ...problem,
      sessionType: practiceSession.sessionType,
    });
  } catch {
    return NextResponse.json(
      { error: "This problem is not available for practice." },
      { status: 403 },
    );
  }

  const isCorrect = checkAnswer(problem, answer);
  const parsedStrokes = parseStrokes(strokes);
  const workQuality = analyzeWorkQuality(parsedStrokes, {
    drawingSeconds: drawingSeconds ?? 0,
  });
  const workFeedback = getWorkFeedback(workQuality, problem.requiresScratchpad);

  if (problem.requiresScratchpad && !workQuality.showedWork) {
    return NextResponse.json(
      {
        error: "Show your work on the scratchpad before submitting.",
        workFeedback,
        workQuality,
      },
      { status: 400 },
    );
  }

  const mistakeCategories = isCorrect
    ? null
    : (Array.isArray(problem.mistakeCategoriesJson)
        ? (problem.mistakeCategoriesJson as string[])[0]
        : "general_error") ?? "general_error";

  const attempt = await prisma.attempt.create({
    data: {
      sessionId,
      studentId: session.user.studentProfileId,
      problemId,
      answer,
      isCorrect,
      elapsedSeconds: elapsedSeconds ?? 0,
      mistakeCategory: mistakeCategories,
      showedWork: workQuality.showedWork,
      workQualityJson: workQuality,
      strokes: parsedStrokes.length
        ? {
            create: {
              strokeDataJson: parsedStrokes,
            },
          }
        : undefined,
    },
  });

  await recordProblemExposures(
    session.user.studentProfileId,
    [problemId],
    sessionId,
  );

  const sessionAttempts = await prisma.attempt.findMany({
    where: { sessionId },
  });
  const correct = sessionAttempts.filter((a) => a.isCorrect).length;
  const times = sessionAttempts.map((a) => a.elapsedSeconds).sort((a, b) => a - b);
  const median =
    times.length === 0
      ? 0
      : times.length % 2 === 1
        ? times[Math.floor(times.length / 2)]
        : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      totalProblems: sessionAttempts.length,
      correctProblems: correct,
      accuracy: sessionAttempts.length ? correct / sessionAttempts.length : 0,
      medianSecondsPerProblem: median,
      activeSeconds: {
        increment: Math.round(elapsedSeconds ?? 0),
      },
    },
  });

  const { placementChange } = await updateMasteryAfterAttempt(
    session.user.studentProfileId,
    problem.skillId,
    sessionId,
  );

  void updateProblemPerformanceStats(problemId).catch(console.error);

  const baseXp = isCorrect ? 10 : 3;
  const accuracyBonus = isCorrect ? 5 : 0;
  const workBonus = getWorkBonusXp(workQuality, problem.requiresScratchpad);
  const xpEarned = await awardXp(
    session.user.studentProfileId,
    baseXp + workBonus,
    accuracyBonus,
  );

  const roast = await pickRoastForSession(sessionId, isCorrect);

  return NextResponse.json({
    attemptId: attempt.id,
    isCorrect,
    explanation: problem.explanation,
    roast,
    workFeedback,
    workQuality,
    workBonusXp: workBonus,
    xpEarned,
    placementChange,
  });
  } catch (error) {
    console.error("Practice submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const practiceSession = await prisma.practiceSession.findFirst({
    where: { id: sessionId, studentId: session.user.studentProfileId },
    include: {
      attempts: { include: { problem: true } },
    },
  });

  if (!practiceSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const phaseData = (practiceSession.phaseJson ?? {}) as {
    questionIds?: string[];
    currentPhase?: string;
    primarySkillId?: string;
  };

  let problemIds = phaseData.questionIds ?? [];
  if (!problemIds.length && phaseData.primarySkillId) {
    const fresh = await selectFreshProblemsForStudent({
      studentId: session.user.studentProfileId,
      skillId: phaseData.primarySkillId,
      count: 10,
      sessionId,
      recordExposure: true,
    });
    problemIds = fresh.map((p) => p.id);
    if (problemIds.length) {
      await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          phaseJson: { ...phaseData, questionIds: problemIds },
        },
      });
    }
  }

  const sessionAttempted = new Set(
    practiceSession.attempts.map((a) => a.problemId),
  );

  const nextId = problemIds.find((id) => !sessionAttempted.has(id));

  const nextProblem = nextId
    ? (await loadProblemsByIds([nextId]))[0] ?? null
    : null;

  return NextResponse.json({
    session: practiceSession,
    nextProblem,
    progress: {
      attempted: sessionAttempted.size,
      total: problemIds.length,
    },
  });
}
