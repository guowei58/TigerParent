"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryIngestionButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    const res = await fetch(`/api/admin/pdf-imports/${documentId}/retry`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      alert("Retry failed");
      return;
    }
    window.dispatchEvent(new CustomEvent("pdf-ingestion-started"));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={retry}
      disabled={loading}
      className="rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      {loading ? "Starting…" : "Retry ingestion"}
    </button>
  );
}
