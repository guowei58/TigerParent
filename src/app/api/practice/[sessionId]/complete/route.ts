import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { advanceLessonPlanAfterUnit } from "@/lib/unit-learning";
import { completePopQuizAssignment } from "@/lib/pop-quiz";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json().catch(() => ({}));
  const advanceUnit = Boolean(body.advanceUnit);
  const skillId = typeof body.skillId === "string" ? body.skillId : undefined;

  const practiceSession = await prisma.practiceSession.findFirst({
    where: { id: sessionId, studentId: session.user.studentProfileId },
  });

  if (!practiceSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const phaseJson = (practiceSession.phaseJson ?? {}) as Record<string, unknown>;
  const resolvedSkillId =
    skillId ?? (phaseJson.primarySkillId as string | undefined);

  if (practiceSession.sessionType === "POP_QUIZ") {
    await completePopQuizAssignment(sessionId);
  }

  let nextSkill = null;
  if (advanceUnit && resolvedSkillId && practiceSession.sessionType !== "POP_QUIZ") {
    nextSkill = await advanceLessonPlanAfterUnit(
      session.user.studentProfileId,
      resolvedSkillId,
    );
  }

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      completed: true,
      endedAt: new Date(),
      phaseJson: {
        ...phaseJson,
        currentPhase: "done",
      },
    },
  });

  return NextResponse.json({
    ok: true,
    nextSkill: nextSkill
      ? { id: nextSkill.id, title: nextSkill.title }
      : null,
  });
}
