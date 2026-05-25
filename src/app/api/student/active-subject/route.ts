import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getActiveSubjectId,
  getStudentSubjectOptions,
  setActiveSubjectId,
} from "@/lib/student-subject";

export async function GET() {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const subjects = await getStudentSubjectOptions(studentId);
  const activeSubjectId = await getActiveSubjectId(studentId);

  return NextResponse.json({ subjects, activeSubjectId });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subjectId } = await request.json();
  if (!subjectId || typeof subjectId !== "string") {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  try {
    await setActiveSubjectId(session.user.studentProfileId, subjectId);
    return NextResponse.json({ activeSubjectId: subjectId });
  } catch {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  }
}
