import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { AttemptReviewDetail } from "@/components/AttemptReviewDetail";
import Link from "next/link";

export default async function WorkReviewPage({
  params,
}: {
  params: Promise<{ studentId: string; attemptId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN")
    redirect("/login");

  const { studentId, attemptId } = await params;
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      problem: { include: { skill: true } },
      strokes: true,
      student: true,
    },
  });
  if (!attempt) notFound();

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Link
          href={`/parent/student/${studentId}/work`}
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to work list
        </Link>
        <AttemptReviewDetail attempt={attempt} />
      </main>
    </div>
  );
}
