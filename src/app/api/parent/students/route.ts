import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    familyId,
    displayName,
    email,
    schoolGrade,
    dailyGoalMinutes = 30,
    targetAheadMonths = 6,
  } = body;

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.create({
    data: {
      email: String(email).toLowerCase(),
      name: displayName,
      password: passwordHash,
      role: "STUDENT",
      familyId,
    },
  });

  const profile = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      familyId,
      displayName,
      schoolGrade,
      dailyGoalMinutes,
      targetAheadMonths,
    },
  });

  await prisma.studentSettings.create({
    data: { studentId: profile.id, onboardingCompleted: false },
  });

  const subjects = await prisma.subject.findMany();
  for (const subject of subjects) {
    await prisma.studentSubject.create({
      data: { studentId: profile.id, subjectId: subject.id, enabled: true },
    });
  }

  return NextResponse.json({ studentId: profile.id });
}
