import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markMistakeDayReviewed } from "@/lib/review";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const dateKey = typeof body.dateKey === "string" ? body.dateKey : null;

  if (!subjectId || !dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json(
      { error: "subjectId and dateKey (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  const enabled = await prisma.studentSubject.findUnique({
    where: {
      studentId_subjectId: {
        studentId: session.user.studentProfileId,
        subjectId,
      },
    },
  });

  if (!enabled?.enabled) {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  }

  await markMistakeDayReviewed(session.user.studentProfileId, subjectId, dateKey);

  return NextResponse.json({ ok: true });
}
