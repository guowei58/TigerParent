import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const phaseName = body.phaseName as string | undefined;
  const phaseIndex = body.phaseIndex as number | undefined;
  const problemIndex = body.problemIndex as number | undefined;

  const practiceSession = await prisma.practiceSession.findFirst({
    where: { id: sessionId, studentId: session.user.studentProfileId },
  });

  if (!practiceSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const phaseJson = (practiceSession.phaseJson ?? {}) as Record<string, unknown>;

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      phaseJson: {
        ...phaseJson,
        currentPhase: phaseName ?? phaseJson.currentPhase,
        progressPhaseIndex: phaseIndex,
        progressProblemIndex: problemIndex,
      } as object,
    },
  });

  return NextResponse.json({ ok: true });
}
