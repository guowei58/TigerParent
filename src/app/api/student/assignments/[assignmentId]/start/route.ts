import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startAssignment } from "@/lib/assignments/builder";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await params;
  const practiceSession = await startAssignment(assignmentId, session.user.studentProfileId);

  return NextResponse.json({
    sessionId: practiceSession.id,
    redirect: `/student/practice/${practiceSession.id}`,
  });
}
