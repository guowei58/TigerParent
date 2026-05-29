import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { WorkQueue } from "@/components/student/WorkQueue";
import { getAssignmentsByType } from "@/lib/assignments/daily-planner";
import type { AssignmentType } from "@/generated/prisma/client";

export function createAssignmentQueuePage(
  types: AssignmentType[],
  title: string,
  subtitle: string,
) {
  return async function AssignmentQueuePage() {
    const session = await auth();
    if (!session?.user?.studentProfileId) redirect("/login");

    const student = await getStudentByUserId(session.user.id);
    const assignments = await getAssignmentsByType(session.user.studentProfileId, types, 30);

    return (
      <div className="min-h-[100dvh] pb-8">
        <StudentNav displayName={student!.displayName} />
        <main className="mx-auto max-w-3xl px-4 py-6">
          <WorkQueue title={title} subtitle={subtitle} assignments={assignments} />
        </main>
      </div>
    );
  };
}
