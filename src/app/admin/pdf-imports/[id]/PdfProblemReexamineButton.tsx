"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfProblemReexamineButton({ problemId }: { problemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function reexamine() {
    const ok = window.confirm(
      "Re-parse the answer from the original PDF and regenerate the AI explanation? The problem will be unapproved until you review it again.",
    );
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/admin/pdf-problems/${problemId}/reexamine-answer`, {
      method: "POST",
    });
    setLoading(false);

    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Reexamine failed");
      return;
    }

    alert(data.message ?? "Done.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={reexamine}
      disabled={loading}
      className="rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-900 px-3 py-1 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
    >
      {loading ? "…" : "Reexamine answer"}
    </button>
  );
}
