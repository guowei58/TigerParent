import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startPopQuizSession } from "@/lib/pop-quiz";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await params;
  const practiceSession = await startPopQuizSession(
    session.user.studentProfileId,
    assignmentId,
  );

  if (!practiceSession) {
    return NextResponse.json({ error: "Pop quiz not found" }, { status: 404 });
  }

  return NextResponse.json({ sessionId: practiceSession.id });
}
