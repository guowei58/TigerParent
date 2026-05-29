import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { buildApproveCheckInput, canApprovePdfProblem } from "@/lib/pdf/approveProblem";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { PdfImportApproveAllButton } from "./PdfImportApproveAllButton";
import { PdfProblemApproveButton } from "./PdfProblemApproveButton";
import { PdfProblemDeleteButton } from "./PdfProblemDeleteButton";
import { PdfImportProblemsTable } from "./PdfImportProblemsTable";
import { IngestionProgressListener } from "./IngestionProgressBar";
import { AdminProblemPreview } from "./AdminProblemPreview";
import { FormattedExplanation } from "@/components/pdf/FormattedExplanation";
import { RetryIngestionButton } from "./RetryIngestionButton";

const TERMINAL_INGESTION = new Set(["needs_review", "completed", "failed"]);

export default async function PdfImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ingesting?: string }>;
}) {
  const session = await auth();
  if (!isAdminSession(session)) redirect("/admin/login");

  const { id } = await params;
  const { ingesting } = await searchParams;
  const doc = await prisma.pdfSourceDocument.findUnique({
    where: { id },
    include: {
      ingestionJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      problems: {
        orderBy: { problemNumber: "asc" },
        include: { choices: true, solution: true, primaryConcept: true },
      },
      answerKey: { orderBy: { problemNumber: "asc" } },
    },
  });
  if (!doc) redirect("/admin/pdf-imports");

  const job = doc.ingestionJobs[0];
  const approved = doc.problems.filter((p) => p.approvedForStudentUse).length;
  const pendingApproval = doc.problems.filter((p) => !p.approvedForStudentUse).length;
  const keyByNumber = new Map(doc.answerKey.map((k) => [k.problemNumber, k]));
  const approvablePending = doc.problems.filter(
    (p) =>
      !p.approvedForStudentUse &&
      canApprovePdfProblem(
        buildApproveCheckInput(p, keyByNumber.get(p.problemNumber) ?? null),
      ),
  ).length;
  const ingestionInProgress = job
    ? !TERMINAL_INGESTION.has(job.status)
    : doc.importStatus !== "needs_review" && doc.importStatus !== "failed";

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div>
          <Link href="/admin/pdf-imports" className="text-sm text-indigo-600">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold mt-2">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-slate-600 text-sm">
              {doc.pageCount} pages · {doc.problems.length} problems · {doc.answerKey.length} answer
              key entries · {approved} approved · Status: {job?.status ?? doc.importStatus}
            </p>
            <PdfImportApproveAllButton documentId={doc.id} pendingCount={approvablePending} />
          </div>
          {pendingApproval > approvablePending && (
            <p className="text-amber-700 text-xs mt-1">
              {pendingApproval - approvablePending} pending problem
              {pendingApproval - approvablePending === 1 ? "" : "s"} missing an image or answer key
              and cannot be bulk-approved.
            </p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            Layout:{" "}
            {doc.ingestionLayout === "one_problem_per_page"
              ? `one problem per page (pages 1–${Math.max(0, doc.pageCount - doc.answerKeyPageCount)} = problems, last ${doc.answerKeyPageCount} pages = answer key)`
              : "auto-detect from text"}
          </p>
          {job && (
            <div className="mt-4">
              <IngestionProgressListener
                documentId={doc.id}
                startPolling={ingesting === "1"}
                initial={{
                  status: job.status,
                  currentStep: job.currentStep,
                  progressPercent: job.progressPercent ?? 0,
                  completed: TERMINAL_INGESTION.has(job.status),
                  errorMessage: job.errorMessage,
                  totalProblemsDetected: job.totalProblemsDetected,
                }}
              />
            </div>
          )}
          {job?.errorMessage && !ingestionInProgress && (
            <p className="text-red-600 text-sm mt-2">Error: {job.errorMessage}</p>
          )}
          {(job?.status === "rendering_pages" ||
            job?.status === "failed" ||
            doc.problems.length === 0) && (
            <div className="mt-3">
              <RetryIngestionButton documentId={doc.id} />
            </div>
          )}
        </div>

        <PdfImportProblemsTable
          problems={doc.problems.map((p) => {
            const key = doc.answerKey.find((k) => k.problemNumber === p.problemNumber);
            return {
              id: p.id,
              problemNumber: p.problemNumber,
              questionType: p.questionType,
              approvedForStudentUse: p.approvedForStudentUse,
              answerLabel: key?.correctChoiceLabel ?? key?.correctAnswerText ?? null,
            };
          })}
        />

        <div className="space-y-6">
          {doc.problems.map((p) => {
            const key = doc.answerKey.find((k) => k.problemNumber === p.problemNumber);
            const img = assetUrl(problemDisplayImagePath(p));
            return (
              <div key={p.id} className="bg-white rounded-2xl border p-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-xs text-slate-500">
                      #{p.problemNumber} · {p.questionType}
                    </p>
                    <PdfProblemDeleteButton problemId={p.id} problemNumber={p.problemNumber} />
                  </div>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={`Problem ${p.problemNumber}`} className="max-w-full border rounded" />
                  ) : (
                    <p className="text-red-600 text-sm">No image</p>
                  )}
                  <AdminProblemPreview questionType={p.questionType} choices={p.choices} />
                </div>
                <div className="text-sm space-y-2">
                  <p>
                    <strong>Concept:</strong> {p.primaryConcept?.name ?? "—"} (
                    {p.conceptConfidence?.toFixed(2) ?? "?"})
                  </p>
                  <p>
                    <strong>Answer key:</strong>{" "}
                    {key?.correctChoiceLabel ?? key?.correctAnswerText ?? "—"}
                  </p>
                  {p.solution?.explanationStepByStep && (
                    <div>
                      <strong>Explanation:</strong>
                      <div className="mt-2 max-h-48 overflow-y-auto">
                        <FormattedExplanation
                          text={p.solution.explanationStepByStep}
                          variant="slate"
                        />
                      </div>
                    </div>
                  )}
                  <ul className="text-xs">
                    {(p.parseWarnings as string[] | null)?.map((w) => (
                      <li key={w} className="text-amber-700">
                        {w}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Link
                      href={`/admin/problems/${p.id}/review`}
                      className="text-indigo-600 text-sm"
                    >
                      Full review
                    </Link>
                    {!p.approvedForStudentUse && <PdfProblemApproveButton problemId={p.id} />}
                    {p.approvedForStudentUse && (
                      <span className="text-emerald-600 text-sm font-medium">Approved</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
