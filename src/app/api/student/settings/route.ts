import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completeStudentOnboarding } from "@/lib/student-onboarding";

export async function GET() {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: session.user.studentProfileId },
    include: { settings: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({
    displayName: student.displayName,
    schoolGrade: student.schoolGrade,
    onboardingCompleted: student.settings?.onboardingCompleted ?? true,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const displayName = String(body.displayName ?? "").trim();
  const schoolGrade = parseInt(String(body.schoolGrade), 10);

  if (!displayName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (Number.isNaN(schoolGrade) || schoolGrade < 1 || schoolGrade > 12) {
    return NextResponse.json(
      { error: "Grade must be between 1 and 12" },
      { status: 400 },
    );
  }

  try {
    const student = await completeStudentOnboarding(
      session.user.studentProfileId,
      { displayName, schoolGrade },
    );

    return NextResponse.json({
      displayName: student.displayName,
      schoolGrade: student.schoolGrade,
      onboardingCompleted: true,
    });
  } catch (error) {
    console.error("Student settings update error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
