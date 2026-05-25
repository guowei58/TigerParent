"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LearnResource = {
  title: string;
  provider: string;
  url: string;
  durationSeconds?: number;
};

type LearnHelpProps = {
  skillId: string;
  show: boolean;
};

export function LearnHelpPanel({ skillId, show }: LearnHelpProps) {
  const [data, setData] = useState<{
    lessonUrl: string;
    skillTitle: string;
    resources: LearnResource[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !skillId) return;
    setLoading(true);
    fetch(`/api/learn/${skillId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .finally(() => setLoading(false));
  }, [show, skillId]);

  if (!show) return null;

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-indigo-900">
        📚 Learn how to solve this
      </p>
      {loading && (
        <p className="text-sm text-indigo-700">Loading help links…</p>
      )}
      {data && (
        <>
          <Link
            href={data.lessonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-white border border-indigo-200 px-4 py-3 text-indigo-800 font-medium hover:bg-indigo-100 transition touch-manipulation"
          >
            <span className="text-xl">📖</span>
            <span>Open full lesson: {data.skillTitle}</span>
          </Link>
          <div className="space-y-2">
            {data.resources.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl bg-white border border-indigo-200 px-4 py-3 hover:bg-indigo-100 transition touch-manipulation"
              >
                <span className="text-lg shrink-0">
                  {r.provider === "YouTube" ? "▶️" : "🎓"}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-indigo-900">{r.title}</span>
                  <span className="block text-xs text-indigo-600">{r.provider}</span>
                </span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
