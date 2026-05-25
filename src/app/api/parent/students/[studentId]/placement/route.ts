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
  const { subjectId, levelId, skillId } = await request.json();

  const level = await prisma.level.findUniqueOrThrow({ where: { id: levelId } });
  const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId } });

  await prisma.studentSubjectPlacement.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    create: {
      studentId,
      subjectId,
      schoolGrade: student.schoolGrade,
      assessedGradeLevel: level.nominalGradeLevel,
      currentLevelId: levelId,
      currentSkillId: skillId,
      monthsAheadOrBehind: level.nominalGradeLevel - student.schoolGrade,
      confidenceScore: 1,
    },
    update: {
      assessedGradeLevel: level.nominalGradeLevel,
      currentLevelId: levelId,
      currentSkillId: skillId,
      monthsAheadOrBehind: level.nominalGradeLevel - student.schoolGrade,
      confidenceScore: 1,
      lastUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
