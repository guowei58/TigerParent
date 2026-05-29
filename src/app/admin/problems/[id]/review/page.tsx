import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { PdfProblemApproveButton } from "@/app/admin/pdf-imports/[id]/PdfProblemApproveButton";
import { FormattedExplanation } from "@/components/pdf/FormattedExplanation";
import { PdfProblemDeleteButton } from "@/app/admin/pdf-imports/[id]/PdfProblemDeleteButton";
import { AdminProblemPreview } from "@/app/admin/pdf-imports/[id]/AdminProblemPreview";

export default async function PdfProblemReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!isAdminSession(session)) redirect("/admin/login");

  const { id } = await params;
  const p = await prisma.pdfPracticeProblem.findUnique({
    where: { id },
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
      solution: true,
      primaryConcept: true,
      sourceDocument: true,
    },
  });
  if (!p) redirect("/admin/pdf-imports");

  const key = await prisma.pdfAnswerKeyEntry.findUnique({
    where: {
      sourceDocumentId_problemNumber: {
        sourceDocumentId: p.sourceDocumentId,
        problemNumber: p.problemNumber,
      },
    },
  });

  const img = assetUrl(problemDisplayImagePath(p));

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Link href={`/admin/pdf-imports/${p.sourceDocumentId}`} className="text-sm text-indigo-600">
          ← {p.sourceDocument.title}
        </Link>
        <h1 className="text-xl font-bold">Problem {p.problemNumber}</h1>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="max-w-full border rounded-lg bg-white" />
        )}
        <AdminProblemPreview questionType={p.questionType} choices={p.choices} />
        <div className="bg-white rounded-xl p-4 text-sm space-y-3">
          <p>
            <strong>Answer key:</strong> {key?.correctChoiceLabel ?? key?.correctAnswerText ?? "—"}
          </p>
          <p>
            <strong>Concept:</strong> {p.primaryConcept?.domain} / {p.primaryConcept?.name}
          </p>
          {p.solution?.explanationStepByStep && (
            <div>
              <strong>AI explanation:</strong>
              <div className="mt-2">
                <FormattedExplanation text={p.solution.explanationStepByStep} variant="slate" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {!p.approvedForStudentUse && <PdfProblemApproveButton problemId={p.id} />}
            {p.approvedForStudentUse && (
              <span className="text-emerald-600 text-sm font-medium">Approved</span>
            )}
            <PdfProblemDeleteButton
              problemId={p.id}
              problemNumber={p.problemNumber}
              redirectTo={`/admin/pdf-imports/${p.sourceDocumentId}`}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
