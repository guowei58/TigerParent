"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfProblemApprovalButton({
  problemId,
  approved,
}: {
  problemId: string;
  approved: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleApproval() {
    setLoading(true);
    const endpoint = approved
      ? `/api/admin/pdf-problems/${problemId}/unapprove`
      : `/api/admin/pdf-problems/${problemId}/approve`;
    const res = await fetch(endpoint, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? (approved ? "Unapprove failed" : "Approve failed"));
      return;
    }
    router.refresh();
  }

  if (approved) {
    return (
      <button
        type="button"
        onClick={toggleApproval}
        disabled={loading}
        className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-1 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
      >
        {loading ? "…" : "Unapprove"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleApproval}
      disabled={loading}
      className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-sm disabled:opacity-50"
    >
      {loading ? "…" : "Approve"}
    </button>
  );
}
