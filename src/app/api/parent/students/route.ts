import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { sendStudentInviteEmail } from "@/lib/auth-tokens";
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

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
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

  try {
    await sendStudentInviteEmail(normalizedEmail, displayName);
  } catch (error) {
    console.error("[students] invite email failed:", error);
    return NextResponse.json(
      {
        error: "Student created but we could not send the invite email. Try resending from settings.",
        studentId: profile.id,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    studentId: profile.id,
    message: "Student account created. They'll receive an email to set their password.",
  });
}
