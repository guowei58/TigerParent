"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfImportApproveAllButton({
  documentId,
  pendingCount,
}: {
  documentId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (pendingCount === 0) return null;

  async function approveAll() {
    const ok = window.confirm(
      `Approve all ${pendingCount} remaining problem${pendingCount === 1 ? "" : "s"} in this import? Problems without an image or answer key will be skipped.`,
    );
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/admin/pdf-imports/${documentId}/approve-all`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error ?? "Bulk approve failed");
      return;
    }

    const skipped = (data.skipped ?? []) as { problemNumber: number; reason: string }[];
    let message = `Approved ${data.approved} problem${data.approved === 1 ? "" : "s"}.`;
    if (skipped.length > 0) {
      const summary = skipped
        .slice(0, 8)
        .map((s) => `#${s.problemNumber} (${s.reason})`)
        .join(", ");
      const more = skipped.length > 8 ? ` and ${skipped.length - 8} more` : "";
      message += `\n\nSkipped ${skipped.length}: ${summary}${more}.`;
    }

    alert(message);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={approveAll}
      disabled={loading}
      className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Approving…" : `Approve all (${pendingCount})`}
    </button>
  );
}
