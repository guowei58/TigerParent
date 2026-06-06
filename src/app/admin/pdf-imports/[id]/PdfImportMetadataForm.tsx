"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function PdfImportMetadataForm({
  documentId,
  initialTitle,
  initialGradeLevel,
}: {
  documentId: string;
  initialTitle: string;
  initialGradeLevel: number | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [gradeLevel, setGradeLevel] = useState(initialGradeLevel ?? 5);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setGradeLevel(initialGradeLevel ?? 5);
  }, [initialTitle, initialGradeLevel]);

  const dirty =
    title.trim() !== initialTitle.trim() ||
    gradeLevel !== (initialGradeLevel ?? 5);

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/pdf-imports/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), gradeLevel }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save changes.");
      return;
    }

    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Import details
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <div>
          <label htmlFor="import-title" className="block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="import-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setMessage(null);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="import-grade" className="block text-sm font-medium text-slate-700">
            Grade
          </label>
          <input
            id="import-grade"
            type="number"
            min={1}
            max={12}
            value={gradeLevel}
            onChange={(e) => {
              setGradeLevel(parseInt(e.target.value, 10) || 5);
              setMessage(null);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <p className="text-xs text-slate-500">
        Changing grade updates all problems in this import for student filtering.
      </p>
    </div>
  );
}
