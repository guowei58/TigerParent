import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  progressScopeFromSession,
  progressStatusAfterCorrectAnswer,
} from "@/lib/pdf-practice/progress";
import { recordPdfProblemAttempt } from "@/lib/pdf-practice/record-attempt";
import { pickTigerParentRoast, type RoastUsage } from "@/lib/tiger-parent-roasts";
import { isParentGradedElaResponse } from "@/lib/pdf/elaDisplay";
import { openResponseReveal, problemExplanationText } from "@/lib/pdf/problemExplanation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    problemId,
    selectedChoiceLabel,
    freeResponseText,
    timeSpentSeconds,
    strokes,
    drawingSeconds,
    roastUsage,
  } = body as {
    problemId: string;
    selectedChoiceLabel?: string;
    freeResponseText?: string;
    timeSpentSeconds?: number;
    strokes?: unknown;
    drawingSeconds?: number;
    roastUsage?: { correct?: number[]; wrong?: number[] };
  };

  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id: problemId },
    include: { solution: true },
  });

  if (!problem?.approvedForStudentUse) {
    return NextResponse.json({ error: "Problem not available" }, { status: 404 });
  }

  const parentGraded =
    isParentGradedElaResponse(problem) && Boolean(freeResponseText?.trim());

  if (parentGraded) {
    const recorded = await recordPdfProblemAttempt({
      problemId,
      userId: session.user.id,
      studentProfileId: session.user.studentProfileId ?? undefined,
      freeResponseText: freeResponseText!.trim(),
      isCorrect: null,
      timeSpentSeconds: timeSpentSeconds ?? null,
      strokes,
      drawingSeconds,
    });

    if (!recorded.ok) {
      return NextResponse.json(
        {
          error: recorded.error,
          workFeedback: recorded.workFeedback,
          blocked: true,
        },
        { status: 400 },
      );
    }

    const key = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: problem.sourceDocumentId,
          problemNumber: problem.problemNumber,
        },
      },
    });

    const reveal = openResponseReveal(problem.solution, key);

    return NextResponse.json({
      manualReview: true,
      progressStatus: "submitted" as const,
      sampleAnswer: reveal.sampleAnswer,
      explanation: reveal.explanation,
    });
  }

  const key = await prisma.pdfAnswerKeyEntry.findUnique({
    where: {
      sourceDocumentId_problemNumber: {
        sourceDocumentId: problem.sourceDocumentId,
        problemNumber: problem.problemNumber,
      },
    },
  });

  const correctLabel =
    problem.solution?.correctChoiceLabel ?? key?.correctChoiceLabel ?? null;
  const correctText =
    problem.solution?.correctAnswerText ?? key?.correctAnswerText ?? null;

  let isCorrect: boolean | null = null;
  if (selectedChoiceLabel && correctLabel) {
    isCorrect = selectedChoiceLabel.toUpperCase() === correctLabel.toUpperCase();
  } else if (freeResponseText && correctText) {
    isCorrect =
      freeResponseText.trim().toLowerCase() === correctText.trim().toLowerCase();
  }

  const scope = progressScopeFromSession(session.user);
  const progressStatus =
    isCorrect && scope
      ? await progressStatusAfterCorrectAnswer(scope, problemId)
      : null;

  const recorded = await recordPdfProblemAttempt({
    problemId,
    userId: session.user.id,
    studentProfileId: session.user.studentProfileId ?? undefined,
    selectedChoiceLabel: selectedChoiceLabel ?? null,
    freeResponseText: freeResponseText ?? null,
    isCorrect,
    timeSpentSeconds: timeSpentSeconds ?? null,
    strokes,
    drawingSeconds,
  });

  if (!recorded.ok) {
    return NextResponse.json(
      {
        error: recorded.error,
        workFeedback: recorded.workFeedback,
        blocked: true,
      },
      { status: 400 },
    );
  }

  const explanation =
    problemExplanationText(problem.solution);

  const normalizedRoastUsage: RoastUsage | undefined = roastUsage
    ? {
        correct: roastUsage.correct ?? [],
        wrong: roastUsage.wrong ?? [],
      }
    : undefined;
  const roastResult = pickTigerParentRoast(Boolean(isCorrect), normalizedRoastUsage);

  if (!isCorrect) {
    return NextResponse.json({
      isCorrect: false,
      roast: roastResult.roast,
      roastUsage: roastResult.usage,
    });
  }

  return NextResponse.json({
    isCorrect: true,
    progressStatus,
    correctChoiceLabel: correctLabel,
    correctAnswerText: correctText,
    explanation,
    roast: roastResult.roast,
    roastUsage: roastResult.usage,
  });
}
