import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { getPendingPopQuiz } from "@/lib/pop-quiz";
import { StudentNav } from "@/components/layouts/StudentNav";
import { PopQuizStudentCard } from "@/components/student/PopQuizStudentCard";

export default async function StudentPopQuizPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  const pending = await getPendingPopQuiz(session.user.studentProfileId);

  if (!pending) {
    redirect("/student");
  }

  return (
    <div className="min-h-[100dvh] pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <PopQuizStudentCard
          title={pending.title}
          skillTitles={pending.skillTitles}
          problemCount={pending.problemCount}
          assignmentId={pending.id}
          sessionId={pending.sessionId}
          status={pending.status}
        />
        <p className="text-center text-sm text-slate-500">
          Your lesson plan and practice are paused until you finish.
        </p>
      </main>
    </div>
  );
}
