"use client";

import { useEffect, useState } from "react";
import { ScratchWorkPreview } from "@/components/ScratchWorkPreview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SectionReviewItem } from "@/lib/pdf-practice/section-review";
import type { PdfProblemProgressStatus } from "@/lib/pdf-practice/progress-shared";

const STATUS_LABEL: Record<PdfProblemProgressStatus, string> = {
  correct: "Correct first try",
  incorrect: "Wrong then fixed",
  skipped: "Skipped",
  submitted: "Saved for parent review",
};

const STATUS_CLASS: Record<PdfProblemProgressStatus, string> = {
  correct: "bg-emerald-100 text-emerald-800 border-emerald-200",
  incorrect: "bg-rose-100 text-rose-800 border-rose-200",
  skipped: "bg-amber-100 text-amber-800 border-amber-200",
  submitted: "bg-slate-100 text-slate-800 border-slate-200",
};

type Props = {
  conceptSlug?: string;
  passageId?: string;
  conceptName: string;
  gradeLevel?: number;
  onBackToSummary: () => void;
};

export function PracticeSectionReview({
  conceptSlug,
  passageId,
  conceptName,
  gradeLevel,
  onBackToSummary,
}: Props) {
  const [items, setItems] = useState<SectionReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const gradeQuery =
      gradeLevel != null ? `&gradeLevel=${encodeURIComponent(String(gradeLevel))}` : "";
    const query = passageId
      ? `passageId=${encodeURIComponent(passageId)}${gradeQuery}`
      : `conceptSlug=${encodeURIComponent(conceptSlug ?? "")}${gradeQuery}`;
    fetch(`/api/practice/section-review?${query}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load your work for this section.");
        return r.json() as Promise<{ items?: SectionReviewItem[] }>;
      })
      .then((data) => {
        setItems(data.items ?? []);
        setIndex(0);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load review.");
        setLoading(false);
      });
  }, [conceptSlug, passageId, gradeLevel]);

  if (loading) {
    return <p className="text-slate-500">Loading your work…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p>{error}</p>
        <Button type="button" className="mt-3" variant="secondary" onClick={onBackToSummary}>
          Back to summary
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <p>No work found to review in this section.</p>
        <Button type="button" className="mt-3" variant="secondary" onClick={onBackToSummary}>
          Back to summary
        </Button>
      </div>
    );
  }

  const current = items[index]!;
  const img = current.problemImageUrl ?? current.fullPageImageUrl;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Review your work
          </p>
          <h2 className="text-lg font-bold text-slate-900">{conceptName}</h2>
          <p className="text-sm text-slate-500">
            Question {index + 1} of {items.length}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onBackToSummary}>
          ← Back to summary
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.problemId}
            type="button"
            title={STATUS_LABEL[item.progressStatus]}
            onClick={() => setIndex(i)}
            className={cn(
              "min-w-[2rem] rounded-lg border px-2 py-1 text-sm font-medium transition-colors",
              i === index
                ? "border-indigo-500 bg-indigo-600 text-white"
                : item.progressStatus === "correct"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : item.progressStatus === "incorrect"
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-amber-300 bg-amber-50 text-amber-800",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
          STATUS_CLASS[current.progressStatus],
        )}
      >
        {STATUS_LABEL[current.progressStatus]}
        {current.attemptCount > 1 ? ` · ${current.attemptCount} tries` : ""}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2 items-start">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Question
            </p>
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={`Question ${index + 1}`}
                className="w-full rounded-xl border border-slate-200 bg-white"
              />
            ) : (
              <p className="text-sm text-slate-500">No image</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Your scratch work
            </p>
            <ScratchWorkPreview strokeData={current.strokeData} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">Your answer</p>
          <p className="text-lg font-semibold text-slate-900 mt-0.5">
            {current.answerDisplay}
          </p>
          {current.attemptedAt && (
            <p className="text-xs text-slate-400 mt-1">
              {new Date(current.attemptedAt).toLocaleString()}
              {current.drawingSeconds != null && current.drawingSeconds > 0
                ? ` · ${Math.round(current.drawingSeconds)}s on scratchpad`
                : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ← Previous
        </Button>
        <Button
          type="button"
          disabled={index >= items.length - 1}
          onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
