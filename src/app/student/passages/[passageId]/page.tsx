import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";
import { prisma } from "@/lib/db";
import { StudentNav } from "@/components/layouts/StudentNav";
import { PdfPracticeClient } from "@/app/student/concepts/[slug]/PdfPracticeClient";

export default async function PassagePracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ passageId: string }>;
  searchParams: Promise<{ grade?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "STUDENT" && session?.user.role !== "ADMIN") {
    redirect("/login");
  }

  const student = session.user.studentProfileId
    ? await getStudentByUserId(session.user.id)
    : null;

  const { passageId } = await params;
  const { grade: gradeParam } = await searchParams;
  const gradeLevel = gradeParam ? parseInt(gradeParam, 10) : undefined;

  const passage = await prisma.pdfReadingPassage.findUnique({
    where: { id: passageId },
    include: {
      sourceDocument: { select: { title: true, gradeLevel: true } },
      problems: {
        where: { approvedForStudentUse: true, reviewStatus: "approved" },
        select: { id: true },
      },
    },
  });

  if (!passage || passage.problems.length === 0) {
    redirect("/student/concepts?subject=english");
  }

  const problemCount = passage.problems.length;

  const title =
    passage.title?.trim() ||
    passage.promptText?.trim().slice(0, 90) ||
    `Passage ${passage.passageNumber}`;

  return (
    <div className="min-h-[100dvh] pb-8">
      {student && <StudentNav displayName={student.displayName} />}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link href="/student/concepts?subject=english" className="text-sm text-indigo-600">
          ← Practice by Topics
        </Link>
        <h1 className="text-2xl font-bold mt-2">{title}</h1>
        <p className="text-slate-600 text-sm">
          {passage.sourceDocument.title}
          {problemCount > 0
            ? ` · ${problemCount} question${problemCount === 1 ? "" : "s"}`
            : ""}
        </p>
        <div className="mt-6">
          <PdfPracticeClient
            passageId={passageId}
            conceptName={title}
            conceptDomain={passage.sourceDocument.title}
            gradeLevel={
              Number.isFinite(gradeLevel)
                ? gradeLevel
                : (passage.sourceDocument.gradeLevel ?? undefined)
            }
          />
        </div>
      </main>
    </div>
  );
}
