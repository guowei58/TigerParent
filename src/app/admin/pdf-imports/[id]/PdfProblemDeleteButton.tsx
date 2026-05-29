"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PdfProblemDeleteButton({
  problemId,
  problemNumber,
  redirectTo,
}: {
  problemId: string;
  problemNumber: number;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    const ok = window.confirm(
      `Delete problem #${problemNumber}? This removes it from student practice and cannot be undone.`,
    );
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/admin/pdf-problems/${problemId}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Delete failed");
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="rounded-lg border border-rose-300 bg-rose-50 text-rose-800 px-3 py-1 text-sm font-medium hover:bg-rose-100 disabled:opacity-50 shrink-0"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
