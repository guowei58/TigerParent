import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { StudentDeskBackground } from "@/components/layouts/StudentDeskBackground";
import { PracticeTopicCatalog } from "@/components/student/PracticeTopicCatalog";
import { progressScopeFromSession } from "@/lib/pdf-practice/progress";
import { listPracticeTopicCatalog } from "@/lib/pdf-practice/selection";

export default async function StudentConceptsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "STUDENT" && session?.user.role !== "ADMIN") {
    redirect("/login");
  }

  const student = session.user.studentProfileId
    ? await getStudentByUserId(session.user.id)
    : null;

  const { subject: highlightSubject } = await searchParams;
  const progressScope = progressScopeFromSession(session.user);
  const catalog = await listPracticeTopicCatalog({ progressScope });

  return (
    <StudentDeskBackground className="pb-10">
      {student && <StudentNav displayName={student.displayName} />}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Practice by Topics
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Pick a subject, open a grade, then choose a topic.
          </p>
        </header>

        <PracticeTopicCatalog catalog={catalog} highlightSubject={highlightSubject} />

        <p className="mt-8">
          <Link
            href="/student"
            className="inline-flex text-sm font-medium text-slate-700 hover:text-indigo-700"
          >
            ← Back to home
          </Link>
        </p>
      </main>
    </StudentDeskBackground>
  );
}
