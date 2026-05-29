import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  progressScopeFromSession,
  recordPdfProblemSkipped,
} from "@/lib/pdf-practice/progress";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = progressScopeFromSession(session.user);
  if (!scope) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { problemId, timeSpentSeconds, strokes, drawingSeconds } =
    (await request.json()) as {
      problemId?: string;
      timeSpentSeconds?: number;
      strokes?: unknown;
      drawingSeconds?: number;
    };
  if (!problemId) {
    return NextResponse.json({ error: "problemId required" }, { status: 400 });
  }

  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id: problemId },
    select: { approvedForStudentUse: true },
  });

  if (!problem?.approvedForStudentUse) {
    return NextResponse.json({ error: "Problem not available" }, { status: 404 });
  }

  const result = await recordPdfProblemSkipped(
    scope,
    problemId,
    session.user.id,
    { timeSpentSeconds, strokes, drawingSeconds },
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        workFeedback: result.workFeedback,
        blocked: true,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, status: "skipped" as const });
}
