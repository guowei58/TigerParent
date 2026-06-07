"use client";

import Link from "next/link";
import type { ReexamineReviewTier } from "@/lib/pdf/reexamineReviewTier";
import { reexamineTierLabel } from "@/lib/pdf/reexamineReviewTier";

export type BulkReexamineItem = {
  id: string;
  problemNumber: number;
  ok: boolean;
  answer?: string | null;
  reviewTier?: ReexamineReviewTier;
  reviewReason?: string;
  error?: string;
};

export function ReexamineBulkSummary({
  items,
  onDismiss,
}: {
  items: BulkReexamineItem[];
  onDismiss: () => void;
}) {
  const questionable = items.filter((i) => i.ok && i.reviewTier === "questionable");
  const confident = items.filter((i) => i.ok && i.reviewTier === "confident");
  const failed = items.filter((i) => !i.ok);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-3">
        <div>
          <h2 className="font-semibold text-indigo-950">Reexamine results</h2>
          <p className="text-sm text-indigo-800/80 mt-0.5">
            {confident.length} likely correct · {questionable.length} need your attention
            {failed.length > 0 ? ` · ${failed.length} failed` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-indigo-700 hover:bg-indigo-100"
        >
          Dismiss
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <h3 className="text-sm font-semibold text-amber-950">
            Needs your attention ({questionable.length})
          </h3>
          <p className="text-xs text-amber-800/90 mt-1">
            Models disagreed, confidence was low, or the answer differs from the document key.
          </p>
          {questionable.length === 0 ? (
            <p className="mt-3 text-sm text-amber-900/70">None — nice!</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {questionable.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/admin/problems/${item.id}/review`}
                      className="font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      #{item.problemNumber}
                    </Link>
                    {item.answer && (
                      <span className="text-slate-600">Answer: {item.answer}</span>
                    )}
                  </div>
                  {item.reviewReason && (
                    <p className="text-xs text-amber-900/80 mt-1">{item.reviewReason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <h3 className="text-sm font-semibold text-emerald-950">
            Likely correct ({confident.length})
          </h3>
          <p className="text-xs text-emerald-800/90 mt-1">
            ChatGPT and Claude agreed — you can review these more quickly.
          </p>
          {confident.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-900/70">None this run.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {confident.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/admin/problems/${item.id}/review`}
                    title={item.reviewReason ?? reexamineTierLabel("confident")}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                  >
                    <span aria-hidden>✓</span>
                    #{item.problemNumber}
                    {item.answer ? ` · ${item.answer}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {failed.length > 0 && (
        <div className="border-t border-rose-100 bg-rose-50/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-rose-900">Failed ({failed.length})</h3>
          <ul className="mt-2 space-y-1 text-sm text-rose-800">
            {failed.map((item) => (
              <li key={item.id}>
                #{item.problemNumber}: {item.error ?? "Unknown error"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ReexamineTierBadge({
  tier,
  reason,
}: {
  tier: ReexamineReviewTier | null;
  reason?: string | null;
}) {
  if (!tier) return null;

  if (tier === "confident") {
    return (
      <span
        title={reason ?? undefined}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
      >
        <span aria-hidden>✓</span>
        Likely correct
      </span>
    );
  }

  return (
    <span
      title={reason ?? undefined}
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
    >
      <span aria-hidden>!</span>
      Needs review
    </span>
  );
}
