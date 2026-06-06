import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const [friendships, pending] = await Promise.all([
    prisma.studentFriendship.findMany({
      where: {
        OR: [{ studentLowId: studentId }, { studentHighId: studentId }],
      },
    }),
    prisma.friendRequest.findMany({
      where: {
        OR: [{ fromStudentId: studentId }, { toStudentId: studentId }],
        status: "PENDING",
      },
    }),
  ]);

  const friendIds = new Set(
    friendships.map((f) =>
      f.studentLowId === studentId ? f.studentHighId : f.studentLowId,
    ),
  );

  const students = await prisma.studentProfile.findMany({
    where: {
      activeStatus: true,
      id: { not: studentId },
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      displayName: true,
      schoolGrade: true,
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      ...s,
      isFriend: friendIds.has(s.id),
      hasPending: pending.some(
        (p) =>
          (p.fromStudentId === studentId && p.toStudentId === s.id) ||
          (p.fromStudentId === s.id && p.toStudentId === studentId),
      ),
    })),
  });
}
