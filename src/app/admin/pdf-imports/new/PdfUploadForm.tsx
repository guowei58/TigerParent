"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";

type IngestionLayout = "one_problem_per_page" | "auto_detect" | "ela_reading_passages";
type RowStatus = "pending" | "uploading" | "done" | "error" | "duplicate";

type PendingPdf = {
  id: string;
  file: File;
  title: string;
  gradeLevel: number;
  subject: string;
  jurisdiction: string;
  ingestionLayout: IngestionLayout;
  answerKeyPageCount: number;
  status: RowStatus;
  documentId?: string;
  error?: string;
};

type SharedDefaults = {
  gradeLevel: number;
  subject: string;
  jurisdiction: string;
  ingestionLayout: IngestionLayout;
  answerKeyPageCount: number;
};

function titleFromFilename(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function newRow(file: File, defaults: SharedDefaults): PendingPdf {
  return {
    id: crypto.randomUUID(),
    file,
    title: titleFromFilename(file.name),
    gradeLevel: defaults.gradeLevel,
    subject: defaults.subject,
    jurisdiction: defaults.jurisdiction,
    ingestionLayout: defaults.ingestionLayout,
    answerKeyPageCount: defaults.answerKeyPageCount,
    status: "pending",
  };
}

async function uploadPdfRow(row: PendingPdf, confirmDuplicate: boolean): Promise<{
  ok: boolean;
  documentId?: string;
  duplicate?: boolean;
  error?: string;
}> {
  const fd = new FormData();
  fd.set("file", row.file);
  fd.set("title", row.title.trim());
  fd.set("gradeLevel", String(row.gradeLevel));
  fd.set("subject", row.subject);
  fd.set("jurisdiction", row.jurisdiction);
  fd.set("ingestionLayout", row.ingestionLayout);
  fd.set("answerKeyPageCount", String(row.answerKeyPageCount));
  if (confirmDuplicate) fd.set("confirmDuplicate", "true");

  const res = await fetch("/api/admin/pdf-imports", { method: "POST", body: fd });
  const data = (await res.json()) as {
    documentId?: string;
    error?: string;
    message?: string;
  };

  if (res.status === 409 && data.error === "duplicate") {
    return { ok: false, duplicate: true };
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? data.message ?? "Upload failed" };
  }
  return { ok: true, documentId: data.documentId };
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export function PdfUploadForm() {
  const fileInputId = useId();
  const [rows, setRows] = useState<PendingPdf[]>([]);
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [defaults, setDefaults] = useState<SharedDefaults>({
    gradeLevel: 5,
    subject: "math",
    jurisdiction: "",
    ingestionLayout: "one_problem_per_page",
    answerKeyPageCount: 1,
  });

  const pendingCount = rows.filter((r) => r.status === "pending" || r.status === "duplicate").length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const allFinished = rows.length > 0 && pendingCount === 0 && !uploading;

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const pdfs = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length === 0) return;

      setRows((prev) => {
        const existingNames = new Set(prev.map((r) => r.file.name));
        const added = pdfs
          .filter((f) => !existingNames.has(f.name))
          .map((f) => newRow(f, defaults));
        return [...prev, ...added];
      });
      setGlobalError(null);
    },
    [defaults],
  );

  function updateRow(id: string, patch: Partial<PendingPdf>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function uploadRow(row: PendingPdf, confirmDuplicate = false) {
    if (!row.title.trim()) {
      updateRow(row.id, { status: "error", error: "Title is required" });
      return;
    }

    updateRow(row.id, { status: "uploading", error: undefined });

    const result = await uploadPdfRow(row, confirmDuplicate);

    if (result.duplicate) {
      updateRow(row.id, { status: "duplicate", error: "This PDF was already imported" });
      return;
    }
    if (!result.ok) {
      updateRow(row.id, { status: "error", error: result.error ?? "Upload failed" });
      return;
    }
    updateRow(row.id, {
      status: "done",
      documentId: result.documentId,
      error: undefined,
    });
  }

  async function onUploadAll() {
    const toUpload = rows.filter((r) => r.status === "pending");
    if (toUpload.length === 0) {
      const duplicates = rows.filter((r) => r.status === "duplicate");
      if (duplicates.length > 0) {
        setGlobalError("Resolve duplicate files below (import anyway or remove them).");
      }
      return;
    }

    const missingTitle = toUpload.some((r) => !r.title.trim());
    if (missingTitle) {
      setGlobalError("Every file needs a title before uploading.");
      return;
    }

    setUploading(true);
    setGlobalError(null);

    await runWithConcurrency(toUpload, 3, async (row) => {
      await uploadRow(row);
    });

    setUploading(false);
  }

  async function onImportDuplicate(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setUploading(true);
    await uploadRow(row, true);
    setUploading(false);
  }

  function applyDefaultsToAll() {
    setRows((prev) =>
      prev.map((r) =>
        r.status === "pending"
          ? {
              ...r,
              gradeLevel: defaults.gradeLevel,
              subject: defaults.subject,
              jurisdiction: defaults.jurisdiction,
              ingestionLayout: defaults.ingestionLayout,
              answerKeyPageCount: defaults.answerKeyPageCount,
            }
          : r,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-2xl border space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Add PDF files</h2>
          <p className="text-sm text-slate-600 mt-1">
            Select one or more PDFs, set title and grade for each, then upload all at once.
            Ingestion runs in the background so you can keep working.
          </p>
        </div>

        <div
          className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-6 text-center"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("border-indigo-400", "bg-indigo-50/50");
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove("border-indigo-400", "bg-indigo-50/50");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-indigo-400", "bg-indigo-50/50");
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          <input
            id={fileInputId}
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <label
            htmlFor={fileInputId}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700"
          >
            Choose PDF files
          </label>
          <p className="text-xs text-slate-500 mt-2">or drag and drop here</p>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Defaults for new files</h2>
          {rows.some((r) => r.status === "pending") && (
            <button
              type="button"
              onClick={applyDefaultsToAll}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Apply to all pending
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Grade</label>
            <input
              type="number"
              min={1}
              max={12}
              value={defaults.gradeLevel}
              onChange={(e) =>
                setDefaults((d) => ({
                  ...d,
                  gradeLevel: parseInt(e.target.value, 10) || 5,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Subject</label>
            <select
              value={defaults.subject}
              onChange={(e) => {
                const subject = e.target.value;
                setDefaults((d) => ({
                  ...d,
                  subject,
                  ingestionLayout:
                    subject === "english" ? "ela_reading_passages" : d.ingestionLayout,
                  answerKeyPageCount: subject === "english" ? 1 : d.answerKeyPageCount,
                }));
              }}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="math">Math</option>
              <option value="english">English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">State / jurisdiction</label>
            <input
              value={defaults.jurisdiction}
              onChange={(e) => setDefaults((d) => ({ ...d, jurisdiction: e.target.value }))}
              placeholder="NY"
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Layout</label>
            <select
              value={defaults.ingestionLayout}
              onChange={(e) =>
                setDefaults((d) => ({
                  ...d,
                  ingestionLayout: e.target.value as IngestionLayout,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="one_problem_per_page">One problem per page (math)</option>
              <option value="ela_reading_passages">ELA reading passages</option>
              <option value="auto_detect">Auto-detect (legacy)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Answer key pages (end)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={defaults.answerKeyPageCount}
              onChange={(e) =>
                setDefaults((d) => ({
                  ...d,
                  answerKeyPageCount: parseInt(e.target.value, 10) || 1,
                }))
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">
              Queue ({rows.length} file{rows.length === 1 ? "" : "s"})
            </h2>
            {doneCount > 0 && (
              <span className="text-sm text-emerald-700">
                {doneCount} uploaded — ingestion running in background
              </span>
            )}
          </div>

          <ul className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <li key={row.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">File {index + 1}</p>
                    <p className="font-medium text-slate-900 truncate" title={row.file.name}>
                      {row.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(row.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={row.status} />
                    {row.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-sm text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                    {row.status === "done" && row.documentId && (
                      <Link
                        href={`/admin/pdf-imports/${row.documentId}?ingesting=1`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>

                {row.status !== "done" && row.status !== "uploading" && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs font-medium text-slate-600">Title *</label>
                      <input
                        value={row.title}
                        onChange={(e) => updateRow(row.id, { title: e.target.value })}
                        className="mt-0.5 w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Grade</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={row.gradeLevel}
                        onChange={(e) =>
                          updateRow(row.id, {
                            gradeLevel: parseInt(e.target.value, 10) || 5,
                          })
                        }
                        className="mt-0.5 w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Subject</label>
                      <select
                        value={row.subject}
                        onChange={(e) => {
                          const subject = e.target.value;
                          updateRow(row.id, {
                            subject,
                            ingestionLayout:
                              subject === "english" ? "ela_reading_passages" : row.ingestionLayout,
                            answerKeyPageCount: subject === "english" ? 1 : row.answerKeyPageCount,
                          });
                        }}
                        className="mt-0.5 w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="math">Math</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Jurisdiction
                      </label>
                      <input
                        value={row.jurisdiction}
                        onChange={(e) => updateRow(row.id, { jurisdiction: e.target.value })}
                        placeholder="NY"
                        className="mt-0.5 w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Layout</label>
                      <select
                        value={row.ingestionLayout}
                        onChange={(e) =>
                          updateRow(row.id, {
                            ingestionLayout: e.target.value as IngestionLayout,
                          })
                        }
                        className="mt-0.5 w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="one_problem_per_page">One problem / page (math)</option>
                        <option value="ela_reading_passages">ELA reading passages</option>
                        <option value="auto_detect">Auto-detect</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Answer key pages
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={row.answerKeyPageCount}
                        onChange={(e) =>
                          updateRow(row.id, {
                            answerKeyPageCount: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="mt-0.5 w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {row.status === "duplicate" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-amber-800">Already in the system.</span>
                    <button
                      type="button"
                      onClick={() => onImportDuplicate(row.id)}
                      disabled={uploading}
                      className="text-indigo-600 font-medium hover:text-indigo-800"
                    >
                      Import anyway
                    </button>
                  </div>
                )}

                {row.error && row.status === "error" && (
                  <p className="text-sm text-red-600">{row.error}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {globalError && <p className="text-red-600 text-sm">{globalError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onUploadAll}
          disabled={uploading || pendingCount === 0}
          className="rounded-xl bg-indigo-600 text-white px-6 py-2.5 font-medium disabled:opacity-50 hover:bg-indigo-700"
        >
          {uploading
            ? `Uploading… (${doneCount}/${rows.length})`
            : pendingCount > 0
              ? `Upload all (${pendingCount})`
              : "Upload all"}
        </button>

        {rows.length > 0 && !uploading && (
          <button
            type="button"
            onClick={() => {
              setRows([]);
              setGlobalError(null);
            }}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear queue
          </button>
        )}

        {allFinished && (
          <Link
            href="/admin/pdf-imports"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
          >
            Go to all imports →
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  const styles: Record<RowStatus, string> = {
    pending: "bg-slate-100 text-slate-700",
    uploading: "bg-indigo-100 text-indigo-800",
    done: "bg-emerald-100 text-emerald-800",
    error: "bg-red-100 text-red-800",
    duplicate: "bg-amber-100 text-amber-900",
  };
  const labels: Record<RowStatus, string> = {
    pending: "Ready",
    uploading: "Uploading…",
    done: "Queued for ingest",
    error: "Failed",
    duplicate: "Duplicate",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
