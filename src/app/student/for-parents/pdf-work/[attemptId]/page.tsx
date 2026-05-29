import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { getStudentPdfAttemptDetail } from "@/lib/analytics";
import { StudentNav } from "@/components/layouts/StudentNav";
import { PdfAttemptReviewDetail } from "@/components/PdfAttemptReviewDetail";
import Link from "next/link";

export default async function ForParentsPdfWorkDetailPage({
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

  const attempt = await getStudentPdfAttemptDetail(
    session.user.studentProfileId,
    attemptId,
  );
  if (!attempt) notFound();

  const backHref = date
    ? `/student/for-parents?date=${date}`
    : "/student/for-parents";

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student.displayName} />
      <main className="mx-auto max-w-4xl px-4 py-3 space-y-4 md:py-4">
        <Link
          href={backHref}
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to daily work
        </Link>
        <p className="text-xs text-slate-500">
          {attempt.createdAt.toLocaleString()}
        </p>
        <PdfAttemptReviewDetail attempt={attempt} />
      </main>
    </div>
  );
}
