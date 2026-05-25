import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertParentOwnsStudent,
  cancelPopQuizAssignment,
  createPopQuizAssignment,
  getPendingPopQuiz,
} from "@/lib/pop-quiz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const student = await assertParentOwnsStudent(
    session.user.familyId,
    studentId,
    session.user.role,
  );
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [pending, recent] = await Promise.all([
    getPendingPopQuiz(studentId),
    prisma.popQuizAssignment.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        session: { select: { completed: true, accuracy: true } },
      },
    }),
  ]);

  return NextResponse.json({ pending, recent });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const session = await auth();
  if (!session?.user.role || (session.user.role !== "PARENT" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const student = await assertParentOwnsStudent(
    session.user.familyId,
    studentId,
    session.user.role,
  );
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const body = await request.json();
  const skillIds = Array.isArray(body.skillIds)
    ? body.skillIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const title = typeof body.title === "string" ? body.title : undefined;

  try {
    const assignment = await createPopQuizAssignment({
      studentId,
      createdByUserId: session.user.id,
      skillIds,
      title,
    });
    return NextResponse.json({ assignment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create pop quiz" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const student = await assertParentOwnsStudent(
    session.user.familyId,
    studentId,
    session.user.role,
  );
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
  }

  const cancelled = await cancelPopQuizAssignment(studentId, assignmentId);
  if (!cancelled) {
    return NextResponse.json({ error: "Pop quiz not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
