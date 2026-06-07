"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfImportApproveLikelyCorrectButton({
  documentId,
  likelyCorrectCount,
}: {
  documentId: string;
  likelyCorrectCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (likelyCorrectCount === 0) return null;

  async function approveLikelyCorrect() {
    const ok = window.confirm(
      `Approve ${likelyCorrectCount} "likely correct" problem${likelyCorrectCount === 1 ? "" : "s"}?\n\nOnly problems marked likely correct after reexamine will be approved. Problems that need review are skipped.`,
    );
    if (!ok) return;

    setLoading(true);
    const res = await fetch(
      `/api/admin/pdf-imports/${documentId}/approve-likely-correct`,
      { method: "POST" },
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error ?? "Bulk approve failed");
      return;
    }

    const skipped = (data.skipped ?? []) as { problemNumber: number; reason: string }[];
    let message = `Approved ${data.approved} likely-correct problem${data.approved === 1 ? "" : "s"}.`;
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
      onClick={approveLikelyCorrect}
      disabled={loading}
      className="rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-900 px-4 py-2 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50"
      title="Approve problems marked likely correct after reexamine"
    >
      {loading ? "Approving…" : `Approve likely correct (${likelyCorrectCount})`}
    </button>
  );
}
