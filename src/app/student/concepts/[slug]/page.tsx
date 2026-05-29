import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";
import { prisma } from "@/lib/db";
import { StudentNav } from "@/components/layouts/StudentNav";
import { PdfPracticeClient } from "./PdfPracticeClient";

export default async function ConceptPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ grade?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "STUDENT" && session?.user.role !== "ADMIN") {
    redirect("/login");
  }

  const student = session.user.studentProfileId
    ? await getStudentByUserId(session.user.id)
    : null;

  const { slug } = await params;
  const { grade: gradeParam } = await searchParams;
  const gradeLevel = gradeParam ? parseInt(gradeParam, 10) : undefined;
  const concept = await prisma.practiceConcept.findUnique({ where: { slug } });
  if (!concept) redirect("/student/concepts");

  return (
    <div className="min-h-[100dvh] pb-8">
      {student && <StudentNav displayName={student.displayName} />}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/student/concepts" className="text-sm text-indigo-600">
          ← Practice by Topics
        </Link>
        <h1 className="text-2xl font-bold mt-2">{concept.name}</h1>
        <p className="text-slate-600 text-sm">{concept.domain}</p>
        <div className="mt-6">
          <PdfPracticeClient
            conceptSlug={slug}
            conceptName={concept.name}
            conceptDomain={concept.domain}
            gradeLevel={Number.isFinite(gradeLevel) ? gradeLevel : undefined}
          />
        </div>
      </main>
    </div>
  );
}
