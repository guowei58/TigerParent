"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [failed, setFailed] = useState(0);
  const targets = problems;

  async function reexamineAll() {
    const ok = window.confirm(
      `Reexamine ${targets.length} problem${targets.length === 1 ? "" : "s"}?\n\nThis will re-parse the answer from the original PDF (when possible), regenerate the AI explanation, and UNAPPROVE each problem until you review it again.`,
    );
    if (!ok) return;

    setRunning(true);
    setDone(0);
    setFailed(0);

    await asyncPool(3, targets, async (p) => {
      try {
        const res = await fetch(
          `/api/admin/pdf-problems/${encodeURIComponent(p.id)}/reexamine-answer`,
          { method: "POST" },
        );
        if (!res.ok) {
          setFailed((x) => x + 1);
        }
      } catch {
        setFailed((x) => x + 1);
      } finally {
        setDone((x) => x + 1);
      }
    });

    setRunning(false);
    alert(
      `Reexamine finished.\n\nSucceeded: ${Math.max(0, targets.length - failed)}\nFailed: ${failed}\n\nProblems were unapproved — review and approve again.`,
    );
    router.refresh();
  }

  if (problems.length === 0) return null;

  return (
    <button
      type="button"
      onClick={reexamineAll}
      disabled={running}
      className="rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-900 px-4 py-2 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
      title={
        "Reexamine all problems in this import"
      }
    >
      {running ? `Reexamining… (${done}/${targets.length})` : "Reexamine answers"}
    </button>
  );
}

