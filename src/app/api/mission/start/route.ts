import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveSubjectId } from "@/lib/student-subject";
import { getContinueLearningState } from "@/lib/unit-learning";

/** Legacy endpoint — returns current unit practice path instead of daily mission. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeSubjectId = await getActiveSubjectId(session.user.studentProfileId);
  if (!activeSubjectId) {
    return NextResponse.json({ error: "No active subject" }, { status: 400 });
  }

  const state = await getContinueLearningState(
    session.user.studentProfileId,
    activeSubjectId,
  );

  if (state.practiceSessionId) {
    return NextResponse.json({
      redirect: `/student/practice/${state.practiceSessionId}`,
    });
  }

  if (state.currentSkill) {
    return NextResponse.json({
      redirect: `/student/practice/new?skillId=${state.currentSkill.id}`,
    });
  }

  return NextResponse.json({ redirect: "/student/concepts" });
}
