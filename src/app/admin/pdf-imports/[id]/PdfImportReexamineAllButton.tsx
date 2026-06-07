"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ReexamineBulkSummary,
  type BulkReexamineItem,
} from "./ReexamineBulkSummary";

type ProblemRef = { id: string; problemNumber: number; approvedForStudentUse: boolean };

async function asyncPool<T>(
  concurrency: number,
  items: T[],
  worker: (item: T) => Promise<void>,
) {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const p = worker(item).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.allSettled(executing);
}

export function PdfImportReexamineAllButton({
  problems,
}: {
  problems: ProblemRef[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [summary, setSummary] = useState<BulkReexamineItem[] | null>(null);
  const targets = problems.filter((p) => !p.approvedForStudentUse);
  const skippedApproved = problems.length - targets.length;

  async function reexamineAll() {
    const ok = window.confirm(
      `Reexamine ${targets.length} unapproved problem${targets.length === 1 ? "" : "s"}?` +
        (skippedApproved > 0
          ? `\n\n${skippedApproved} already approved will be skipped.`
          : "") +
        `\n\nEach problem runs through ChatGPT and Claude. You'll get a list of questionable answers to focus on, and likely-correct ones you can review quickly.`,
    );
    if (!ok) return;

    setRunning(true);
    setDone(0);
    setSummary(null);
    const results: BulkReexamineItem[] = [];

    await asyncPool(3, targets, async (p) => {
      try {
        const res = await fetch(
          `/api/admin/pdf-problems/${encodeURIComponent(p.id)}/reexamine-answer`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          results.push({
            id: p.id,
            problemNumber: p.problemNumber,
            ok: false,
            error: data.error ?? `HTTP ${res.status}`,
          });
        } else {
          results.push({
            id: p.id,
            problemNumber: p.problemNumber,
            ok: true,
            answer: data.answer ?? null,
            reviewTier: data.reviewTier,
            reviewReason: data.reviewReason,
          });
        }
      } catch (error) {
        results.push({
          id: p.id,
          problemNumber: p.problemNumber,
          ok: false,
          error: error instanceof Error ? error.message : "Request failed",
        });
      } finally {
        setDone((x) => x + 1);
      }
    });

    results.sort((a, b) => a.problemNumber - b.problemNumber);
    setSummary(results);
    setRunning(false);
    router.refresh();
  }

  if (targets.length === 0) return null;

  const failedCount = summary?.filter((i) => !i.ok).length ?? 0;
  const questionableCount =
    summary?.filter((i) => i.ok && i.reviewTier === "questionable").length ?? 0;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={reexamineAll}
        disabled={running}
        className="rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-900 px-4 py-2 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
        title="Reexamine unapproved problems in this import"
      >
        {running
          ? `Reexamining… (${done}/${targets.length})`
          : `Reexamine answers (${targets.length} unapproved)`}
      </button>

      {summary && (
        <ReexamineBulkSummary items={summary} onDismiss={() => setSummary(null)} />
      )}

      {summary && failedCount > 0 && (
        <p className="text-xs text-rose-700">{failedCount} problem(s) failed to reexamine.</p>
      )}
      {summary && questionableCount > 0 && (
        <p className="text-xs text-amber-800">
          {questionableCount} problem(s) flagged in the table below with &quot;Needs review&quot;.
        </p>
      )}
    </div>
  );
}
