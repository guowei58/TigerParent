import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { PopQuizForm } from "@/components/parent/PopQuizForm";
import Link from "next/link";
import {
  assertParentOwnsStudent,
  getPendingPopQuiz,
  getPopQuizSkillsForStudent,
} from "@/lib/pop-quiz";

export default async function ParentPopQuizPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const { studentId } = await params;
  const student = await assertParentOwnsStudent(
    session.user.familyId,
    studentId,
    session.user.role,
  );
  if (!student) notFound();

  const profile = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: { displayName: true },
  });

  const [subjects, pending] = await Promise.all([
    getPopQuizSkillsForStudent(studentId),
    getPendingPopQuiz(studentId),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/parent" className="text-indigo-600 hover:underline">
            Dashboard
          </Link>
          <span className="text-slate-400">/</span>
          <Link href={`/parent/student/${studentId}`} className="text-indigo-600 hover:underline">
            {profile.displayName}
          </Link>
          <span className="text-slate-400">/</span>
          <span>Pop Quiz</span>
        </div>

        <Card>
          <CardTitle className="text-2xl">Pop Quiz for {profile.displayName} 🎯</CardTitle>
          <PopQuizForm
            studentId={studentId}
            studentName={profile.displayName}
            subjects={subjects}
            pending={
              pending
                ? {
                    id: pending.id,
                    title: pending.title,
                    status: pending.status,
                    skillTitles: pending.skillTitles,
                  }
                : null
            }
          />
        </Card>
      </main>
    </div>
  );
}
