import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
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
    <div className="min-h-[100dvh] pb-10 bg-slate-50">
      {student && <StudentNav displayName={student.displayName} />}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Practice by Topics
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mt-1.5 max-w-prose">
            Choose a subject, then expand a grade to pick a topic or reading passage.
          </p>
        </header>

        <PracticeTopicCatalog catalog={catalog} highlightSubject={highlightSubject} />

        <p className="mt-10">
          <Link href="/student" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
