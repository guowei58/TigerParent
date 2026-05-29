import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { PdfImportDeleteButton } from "./PdfImportDeleteButton";

export default async function PdfImportsPage() {
  const session = await auth();
  if (!isAdminSession(session)) redirect("/admin/login");

  const docs = await prisma.pdfSourceDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      ingestionJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { problems: true } },
    },
  });

  const approvalRows = await prisma.pdfPracticeProblem.groupBy({
    by: ["sourceDocumentId", "approvedForStudentUse"],
    _count: { _all: true },
  });

  const approvalByDoc = new Map<string, { approved: number; pending: number }>();
  for (const row of approvalRows) {
    const cur = approvalByDoc.get(row.sourceDocumentId) ?? { approved: 0, pending: 0 };
    if (row.approvedForStudentUse) {
      cur.approved = row._count._all;
    } else {
      cur.pending = row._count._all;
    }
    approvalByDoc.set(row.sourceDocumentId, cur);
  }

  let totalApproved = 0;
  let totalPending = 0;
  for (const d of docs) {
    const c = approvalByDoc.get(d.id) ?? { approved: 0, pending: 0 };
    totalApproved += c.approved;
    totalPending += c.pending;
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">PDF Imports</h1>
            {docs.length > 0 && (
              <p className="text-sm text-slate-600 mt-1">
                <span className="text-emerald-700 font-medium">{totalApproved} approved</span>
                {" · "}
                <span className="text-amber-700 font-medium">{totalPending} need approval</span>
                {" · "}
                {totalApproved + totalPending} total problems
              </p>
            )}
          </div>
          <Link
            href="/admin/pdf-imports/new"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-medium"
          >
            Upload PDFs
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Grade</th>
                <th className="p-3">Status</th>
                <th className="p-3">Problems</th>
                <th className="p-3">Approval</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const approval = approvalByDoc.get(d.id) ?? { approved: 0, pending: 0 };
                const total = d._count.problems;
                const allApproved = total > 0 && approval.pending === 0;
                const noneApproved = approval.approved === 0 && total > 0;

                return (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{d.title}</td>
                  <td className="p-3">G{d.gradeLevel}</td>
                  <td className="p-3">{d.ingestionJobs[0]?.status ?? d.importStatus}</td>
                  <td className="p-3">{total}</td>
                  <td className="p-3">
                    {total === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-col gap-0.5">
                        <span className={allApproved ? "text-emerald-700 font-medium" : ""}>
                          {approval.approved} approved
                        </span>
                        <span
                          className={
                            approval.pending > 0
                              ? "text-amber-700 font-medium"
                              : "text-slate-400"
                          }
                        >
                          {approval.pending} need approval
                        </span>
                        {noneApproved && (
                          <span className="text-xs text-slate-500">not started</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Link href={`/admin/pdf-imports/${d.id}`} className="text-indigo-600">
                        Review
                      </Link>
                      <PdfImportDeleteButton
                        documentId={d.id}
                        title={d.title}
                        problemCount={d._count.problems}
                      />
                    </div>
                  </td>
                </tr>
              );
              })}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No PDFs uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
