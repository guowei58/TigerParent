import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const body = await request.json();

  await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      schoolGrade: body.schoolGrade,
      dailyGoalMinutes: body.dailyGoalMinutes,
      targetAheadMonths: body.targetAheadMonths,
    },
  });

  await prisma.studentSettings.upsert({
    where: { studentId },
    create: {
      studentId,
      autoAdvance: body.autoAdvance,
      weekendEnabled: body.weekendEnabled,
      difficultyAdjust: body.difficultyAdjust,
    },
    update: {
      autoAdvance: body.autoAdvance,
      weekendEnabled: body.weekendEnabled,
      difficultyAdjust: body.difficultyAdjust,
    },
  });

  return NextResponse.json({ ok: true });
}
