"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfProblemApproveButton({ problemId }: { problemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    const res = await fetch(`/api/admin/pdf-problems/${problemId}/approve`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Approve failed");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={approve}
      disabled={loading}
      className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-sm disabled:opacity-50"
    >
      {loading ? "…" : "Approve"}
    </button>
  );
}
