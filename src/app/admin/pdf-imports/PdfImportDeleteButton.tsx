"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfImportDeleteButton({
  documentId,
  title,
  problemCount,
}: {
  documentId: string;
  title: string;
  problemCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    const ok = window.confirm(
      `Delete "${title}" and all ${problemCount} problem${problemCount === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/admin/pdf-imports/${documentId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="rounded-lg border border-rose-300 bg-rose-50 text-rose-800 px-3 py-1 text-sm font-medium hover:bg-rose-100 disabled:opacity-50"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
