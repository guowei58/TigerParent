import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getStudentAttemptDetail } from "@/lib/analytics";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { AttemptReviewDetail } from "@/components/AttemptReviewDetail";
import Link from "next/link";
import { getAssignmentRationaleForProblem } from "@/lib/assignment-rationale";
import { Card, CardTitle } from "@/components/ui/Card";

export default async function ForParentsWorkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  if (!student) redirect("/login");

  const { attemptId } = await params;
  const { date } = await searchParams;

  const attempt = await getStudentAttemptDetail(
    session.user.studentProfileId,
    attemptId,
  );
  if (!attempt) notFound();

  const rationale = await getAssignmentRationaleForProblem(
    session.user.studentProfileId,
    attempt.problemId,
    attempt.session?.sessionType,
    attempt.sessionId,
  );

  const backHref = date
    ? `/student/for-parents?date=${date}`
    : "/student/for-parents";

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-3 space-y-4 md:py-4">
        <Link
          href={backHref}
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to daily work
        </Link>
        <p className="text-xs text-slate-500">
          {attempt.createdAt.toLocaleString()}
        </p>
        <AttemptReviewDetail attempt={attempt} rationale={rationale} />
      </main>
    </div>
  );
}
