import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { assetUrl, elaQuestionDisplayImagePath, problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { PdfProblemApprovalButton } from "@/app/admin/pdf-imports/[id]/PdfProblemApprovalButton";
import { PdfProblemReexamineButton } from "@/app/admin/pdf-imports/[id]/PdfProblemReexamineButton";
import { FormattedExplanation } from "@/components/pdf/FormattedExplanation";
import { PdfProblemDeleteButton } from "@/app/admin/pdf-imports/[id]/PdfProblemDeleteButton";
import { AdminProblemPreview } from "@/app/admin/pdf-imports/[id]/AdminProblemPreview";
import { PdfPassagePanel } from "@/components/pdf/PdfPassagePanel";
import { passageViewFromDb } from "@/lib/pdf/passageView";
import { elaQuestionStem } from "@/lib/pdf/elaDisplay";

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
      passage: true,
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

  const isEla = Boolean(p.passageId || p.passage);
  const img = isEla
    ? assetUrl(elaQuestionDisplayImagePath(p), p.updatedAt.getTime())
    : assetUrl(problemDisplayImagePath(p), p.updatedAt.getTime());
  const passageView = p.passage ? passageViewFromDb(p.passage) : null;
  const questionStem = elaQuestionStem(p.cleanedText, p.choices);

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <Link href={`/admin/pdf-imports/${p.sourceDocumentId}`} className="text-sm text-indigo-600">
          ← {p.sourceDocument.title}
        </Link>
        <h1 className="text-xl font-bold">Problem {p.problemNumber}</h1>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div>
            {isEla && passageView ? (
              <PdfPassagePanel passage={passageView} variant="student" />
            ) : img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="max-w-full border rounded-lg bg-white" />
            ) : null}
          </div>
          <div className="space-y-4">
            {isEla && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Question
                </p>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={`Problem ${p.problemNumber}`}
                    className="block h-auto w-full max-h-[min(70vh,640px)] object-contain object-top rounded-lg border border-slate-200 bg-white"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap text-slate-900">{questionStem}</p>
                )}
              </div>
            )}
            <AdminProblemPreview
              questionType={p.questionType}
              choices={p.choices}
              showChoiceText={false}
              orientation="grid"
            />
          </div>
        </div>
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
            <PdfProblemReexamineButton problemId={p.id} />
            <PdfProblemApprovalButton problemId={p.id} approved={p.approvedForStudentUse} />
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
