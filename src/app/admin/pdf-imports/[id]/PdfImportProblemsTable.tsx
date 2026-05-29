"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PdfProblemApproveButton } from "./PdfProblemApproveButton";

type ProblemRow = {
  id: string;
  problemNumber: number;
  questionType: string;
  approvedForStudentUse: boolean;
  answerLabel: string | null;
};

export function PdfImportProblemsTable({ problems }: { problems: ProblemRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteProblem(problem: ProblemRow) {
    const ok = window.confirm(
      `Delete problem #${problem.problemNumber}? This removes it from student practice and cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(problem.id);
    const res = await fetch(`/api/admin/pdf-problems/${problem.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Delete failed");
      return;
    }

    router.refresh();
  }

  if (problems.length === 0) {
    return (
      <p className="text-sm text-slate-500 bg-white rounded-2xl border p-4">
        No problems extracted yet.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <h2 className="font-semibold text-slate-900">Problems in this import</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Delete bad extractions here, or scroll down for full previews.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b">
            <tr>
              <th className="p-3 w-16">#</th>
              <th className="p-3">Type</th>
              <th className="p-3">Answer</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="p-3 font-medium">{p.problemNumber}</td>
                <td className="p-3 text-slate-600">{p.questionType.replace(/_/g, " ")}</td>
                <td className="p-3">{p.answerLabel ?? "—"}</td>
                <td className="p-3">
                  {p.approvedForStudentUse ? (
                    <span className="text-emerald-700 font-medium">Approved</span>
                  ) : (
                    <span className="text-amber-700">Needs review</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/admin/problems/${p.id}/review`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Review
                    </Link>
                    {!p.approvedForStudentUse && <PdfProblemApproveButton problemId={p.id} />}
                    <button
                      type="button"
                      onClick={() => deleteProblem(p)}
                      disabled={deletingId === p.id}
                      className="rounded-lg border border-rose-300 bg-rose-50 text-rose-800 px-3 py-1 text-sm font-medium hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingId === p.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
