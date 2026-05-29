import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { startAssignment } from "@/lib/assignments/builder";

export default async function StartAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ assignmentId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const { assignmentId } = await searchParams;
  if (!assignmentId) redirect("/student");

  const practiceSession = await startAssignment(assignmentId, session.user.studentProfileId);
  redirect(`/student/practice/${practiceSession.id}`);
}
