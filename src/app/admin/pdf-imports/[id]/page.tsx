import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { buildApproveCheckInput, canApprovePdfProblem } from "@/lib/pdf/approveProblem";
import { assetUrl, problemDisplayImagePath, elaQuestionDisplayImagePath } from "@/lib/pdf/displayPaths";
import { PdfImportApproveAllButton } from "./PdfImportApproveAllButton";
import { PdfImportApproveLikelyCorrectButton } from "./PdfImportApproveLikelyCorrectButton";
import { PdfProblemApprovalButton } from "./PdfProblemApprovalButton";
import { PdfProblemReexamineButton } from "./PdfProblemReexamineButton";
import { PdfProblemDeleteButton } from "./PdfProblemDeleteButton";
import { PdfImportProblemsTable } from "./PdfImportProblemsTable";
import { PdfImportReexamineAllButton } from "./PdfImportReexamineAllButton";
import { PdfImportMetadataForm } from "./PdfImportMetadataForm";
import { IngestionProgressListener } from "./IngestionProgressBar";
import { AdminProblemPreview } from "./AdminProblemPreview";
import { FormattedExplanation } from "@/components/pdf/FormattedExplanation";
import { RetryIngestionButton } from "./RetryIngestionButton";
import { PdfPassagePanel } from "@/components/pdf/PdfPassagePanel";
import { passageViewFromDb } from "@/lib/pdf/passageView";
import { elaQuestionStem } from "@/lib/pdf/elaDisplay";
import { parseReexamineReviewTier } from "@/lib/pdf/reexamineReviewTier";
import { ReexamineTierBadge } from "./ReexamineBulkSummary";

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
        include: {
          choices: { orderBy: { sortOrder: "asc" } },
          solution: true,
          primaryConcept: true,
          passage: true,
        },
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
  const approvableLikelyCorrect = doc.problems.filter((p) => {
    if (p.approvedForStudentUse) return false;
    if (parseReexamineReviewTier(p.parseWarnings).tier !== "confident") return false;
    return canApprovePdfProblem(
      buildApproveCheckInput(p, keyByNumber.get(p.problemNumber) ?? null),
    );
  }).length;
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
          <PdfImportMetadataForm
            documentId={doc.id}
            initialTitle={doc.title}
            initialGradeLevel={doc.gradeLevel}
          />
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-slate-600 text-sm">
              {doc.pageCount} pages · {doc.problems.length} problems · {doc.answerKey.length} answer
              key entries · {approved} approved · Status: {job?.status ?? doc.importStatus}
            </p>
            <PdfImportApproveLikelyCorrectButton
              documentId={doc.id}
              likelyCorrectCount={approvableLikelyCorrect}
            />
            <PdfImportApproveAllButton documentId={doc.id} pendingCount={approvablePending} />
          </div>
          <PdfImportReexamineAllButton
            problems={doc.problems.map((p) => ({
              id: p.id,
              problemNumber: p.problemNumber,
              approvedForStudentUse: p.approvedForStudentUse,
            }))}
          />
          {pendingApproval > approvablePending && (
            <p className="text-amber-700 text-xs mt-1">
              {pendingApproval - approvablePending} pending problem
              {pendingApproval - approvablePending === 1 ? "" : "s"} missing an image or answer key
              and cannot be bulk-approved.
            </p>
          )}
          <p className="text-slate-500 text-xs mt-1">
            Layout:{" "}
            {doc.ingestionLayout === "ela_reading_passages"
              ? "ELA reading passages (shared passage per question set)"
              : doc.ingestionLayout === "one_problem_per_page"
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
          {doc.ingestionLayout === "one_problem_per_page" &&
            (doc.subject ?? "").toLowerCase().includes("english") && (
              <p className="text-amber-800 text-sm mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                This English PDF was ingested with the math layout (one problem per page). Passages
                and answer choices will not parse correctly. Click <strong>Retry ingestion</strong>{" "}
                below — English PDFs now auto-switch to the ELA reading layout.
              </p>
            )}
          {job?.errorMessage && !ingestionInProgress && (
            <p className="text-red-600 text-sm mt-2">Error: {job.errorMessage}</p>
          )}
          {(job?.status === "rendering_pages" ||
            job?.status === "failed" ||
            doc.problems.length === 0 ||
            (doc.ingestionLayout === "one_problem_per_page" &&
              (doc.subject ?? "").toLowerCase().includes("english"))) && (
            <div className="mt-3">
              <RetryIngestionButton documentId={doc.id} />
            </div>
          )}
        </div>

        <PdfImportProblemsTable
          problems={doc.problems.map((p) => {
            const key = doc.answerKey.find((k) => k.problemNumber === p.problemNumber);
            const reexamine = parseReexamineReviewTier(p.parseWarnings);
            return {
              id: p.id,
              problemNumber: p.problemNumber,
              questionType: p.questionType,
              approvedForStudentUse: p.approvedForStudentUse,
              answerLabel: key?.correctChoiceLabel ?? key?.correctAnswerText ?? null,
              reexamineTier: reexamine.tier,
              reexamineReason: reexamine.reason,
            };
          })}
        />

        <div className="space-y-6">
          {[...doc.problems]
            .sort((a, b) => {
              const rank = (tier: ReturnType<typeof parseReexamineReviewTier>["tier"]) => {
                if (tier === "questionable") return 0;
                if (tier === "confident") return 1;
                return 2;
              };
              const diff =
                rank(parseReexamineReviewTier(a.parseWarnings).tier) -
                rank(parseReexamineReviewTier(b.parseWarnings).tier);
              return diff !== 0 ? diff : a.problemNumber - b.problemNumber;
            })
            .map((p) => {
            const key = doc.answerKey.find((k) => k.problemNumber === p.problemNumber);
            const img = assetUrl(problemDisplayImagePath(p), p.updatedAt.getTime());
            const isEla = Boolean(p.passageId || p.passage);
            const passageView = p.passage ? passageViewFromDb(p.passage) : null;
            const questionStem = elaQuestionStem(p.cleanedText, p.choices);
            const elaQuestionImage = isEla
              ? assetUrl(elaQuestionDisplayImagePath(p), p.updatedAt.getTime())
              : null;
            const reexamine = parseReexamineReviewTier(p.parseWarnings);
            const visibleWarnings = ((p.parseWarnings as string[] | null) ?? []).filter(
              (w) => !String(w).startsWith("reexamine-tier:"),
            );
            return (
              <div key={p.id} className="bg-white rounded-2xl border p-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-500">
                        #{p.problemNumber} · {p.questionType}
                      </p>
                      <ReexamineTierBadge
                        tier={reexamine.tier}
                        reason={reexamine.reason}
                      />
                    </div>
                    <PdfProblemDeleteButton problemId={p.id} problemNumber={p.problemNumber} />
                  </div>
                  {isEla && passageView ? (
                    <PdfPassagePanel passage={passageView} variant="student" />
                  ) : img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={`Problem ${p.problemNumber}`} className="max-w-full border rounded" />
                  ) : (
                    <p className="text-red-600 text-sm">No image</p>
                  )}
                </div>
                <div className="text-sm space-y-2">
                  {isEla && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Question
                      </p>
                      {elaQuestionImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={elaQuestionImage}
                          alt={`Problem ${p.problemNumber}`}
                          className="block h-auto w-full max-h-[min(70vh,640px)] object-contain object-top rounded-lg border border-slate-200 bg-white"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap text-slate-900">{questionStem}</p>
                      )}
                    </div>
                  )}
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
                    {visibleWarnings.map((w, i) => (
                      <li key={`${i}-${w}`} className="text-amber-700">
                        {w}
                      </li>
                    ))}
                  </ul>
                  <AdminProblemPreview
                    questionType={p.questionType}
                    choices={p.choices}
                    showChoiceText={false}
                    orientation="grid"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Link
                      href={`/admin/problems/${p.id}/review`}
                      className="text-indigo-600 text-sm"
                    >
                      Full review
                    </Link>
                    <PdfProblemReexamineButton problemId={p.id} />
                    <PdfProblemApprovalButton problemId={p.id} approved={p.approvedForStudentUse} />
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
