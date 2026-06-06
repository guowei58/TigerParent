"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatPracticeSubjectLabel,
  type PracticeGradeGroup,
  type PracticePassageItem,
  type PracticeTopicItem,
} from "@/lib/pdf-practice/catalogTypes";
import { cn } from "@/lib/utils";

type SubjectCatalog = {
  subjectKey: string;
  label: string;
  grades: {
    gradeLevel: number;
    label: string;
    domains: { domain: string; topics: PracticeTopicItem[] }[];
    passages?: PracticePassageItem[];
  }[];
};

type SubjectTheme = {
  tabActive: string;
  tabIdle: string;
  iconBg: string;
  iconText: string;
  domainBg: string;
  domainBorder: string;
  progress: string;
  progressComplete: string;
  pillActive: string;
  pillIdle: string;
  rowHover: string;
  rowTitleHover: string;
};

function formatDomainLabel(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return "General";
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (!isAllCaps) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isEnglishSubject(subject: string): boolean {
  const s = subject.toLowerCase();
  return s.includes("english") || s.includes("ela") || s.includes("reading");
}

function subjectTheme(subject: string): SubjectTheme {
  if (isEnglishSubject(subject)) {
    return {
      tabActive: "bg-violet-600 text-white shadow-sm shadow-violet-200",
      tabIdle: "bg-white text-slate-600 border border-slate-200 hover:border-violet-200 hover:text-violet-700",
      iconBg: "bg-violet-100",
      iconText: "text-violet-800",
      domainBg: "bg-violet-50/40",
      domainBorder: "border-violet-100",
      progress: "bg-violet-400",
      progressComplete: "bg-emerald-500",
      pillActive: "bg-violet-100 text-violet-800",
      pillIdle: "bg-slate-100 text-slate-500",
      rowHover: "hover:border-violet-100 hover:bg-white",
      rowTitleHover: "group-hover:text-violet-800",
    };
  }
  if (subject.toLowerCase().includes("math")) {
    return {
      tabActive: "bg-indigo-600 text-white shadow-sm shadow-indigo-200",
      tabIdle: "bg-white text-slate-600 border border-slate-200 hover:border-indigo-200 hover:text-indigo-700",
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-800",
      domainBg: "bg-indigo-50/40",
      domainBorder: "border-indigo-100",
      progress: "bg-indigo-400",
      progressComplete: "bg-emerald-500",
      pillActive: "bg-indigo-100 text-indigo-800",
      pillIdle: "bg-slate-100 text-slate-500",
      rowHover: "hover:border-indigo-100 hover:bg-white",
      rowTitleHover: "group-hover:text-indigo-800",
    };
  }
  return {
    tabActive: "bg-slate-700 text-white shadow-sm",
    tabIdle: "bg-white text-slate-600 border border-slate-200 hover:border-slate-300",
    iconBg: "bg-slate-100",
    iconText: "text-slate-700",
    domainBg: "bg-slate-50",
    domainBorder: "border-slate-200",
    progress: "bg-slate-400",
    progressComplete: "bg-emerald-500",
    pillActive: "bg-slate-200 text-slate-800",
    pillIdle: "bg-slate-100 text-slate-500",
    rowHover: "hover:border-slate-200 hover:bg-white",
    rowTitleHover: "group-hover:text-slate-900",
  };
}

function pivotCatalog(catalog: PracticeGradeGroup[]): SubjectCatalog[] {
  const bySubject = new Map<string, SubjectCatalog>();

  for (const grade of catalog) {
    for (const subject of grade.subjects) {
      if (!bySubject.has(subject.subject)) {
        bySubject.set(subject.subject, {
          subjectKey: subject.subject,
          label: formatPracticeSubjectLabel(subject.subject),
          grades: [],
        });
      }
      bySubject.get(subject.subject)!.grades.push({
        gradeLevel: grade.gradeLevel,
        label: grade.label,
        domains: subject.domains,
        passages: subject.passages,
      });
    }
  }

  return [...bySubject.values()]
    .map((entry) => ({
      ...entry,
      grades: entry.grades.sort((a, b) => a.gradeLevel - b.gradeLevel),
    }))
    .sort((a, b) => {
      const order = (s: string) =>
        isEnglishSubject(s) ? 1 : s.toLowerCase().includes("math") ? 0 : 2;
      return order(a.subjectKey) - order(b.subjectKey) || a.label.localeCompare(b.label);
    });
}

function gradeStats(grade: SubjectCatalog["grades"][0]) {
  let topics = 0;
  let total = 0;
  let done = 0;

  if (grade.passages?.length) {
    topics += grade.passages.length;
    for (const p of grade.passages) {
      total += p.totalCount;
      done += p.doneCount;
    }
  }
  for (const domain of grade.domains) {
    topics += domain.topics.length;
    for (const t of domain.topics) {
      total += t.totalCount;
      done += t.doneCount;
    }
  }

  return { topics, total, done, left: Math.max(0, total - done) };
}

function subjectStats(subject: SubjectCatalog) {
  let topics = 0;
  let total = 0;
  let done = 0;
  for (const grade of subject.grades) {
    const s = gradeStats(grade);
    topics += s.topics;
    total += s.total;
    done += s.done;
  }
  return { topics, total, done };
}

function ProgressPill({
  done,
  total,
  theme,
}: {
  done: number;
  total: number;
  theme: SubjectTheme;
}) {
  const complete = total > 0 && done >= total;
  return (
    <span
      className={cn(
        "shrink-0 text-[11px] font-semibold tabular-nums px-2.5 py-0.5 rounded-full",
        complete ? "bg-emerald-50 text-emerald-700" : done > 0 ? theme.pillActive : theme.pillIdle,
      )}
    >
      {complete ? "Done" : `${done}/${total}`}
    </span>
  );
}

function TopicRow({ topic, theme }: { topic: PracticeTopicItem; theme: SubjectTheme }) {
  const pct = topic.totalCount > 0 ? Math.min(100, (topic.doneCount / topic.totalCount) * 100) : 0;
  const complete = topic.totalCount > 0 && topic.leftCount === 0;

  return (
    <Link
      href={`/student/concepts/${topic.slug}?grade=${topic.gradeLevel}`}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-transparent px-3 py-2.5 transition-all",
        theme.rowHover,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-sm font-medium text-slate-800 leading-snug", theme.rowTitleHover)}>
          {topic.name}
        </span>
        <ProgressPill done={topic.doneCount} total={topic.totalCount} theme={theme} />
      </div>
      <div
        className="h-1 rounded-full bg-white/80 ring-1 ring-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={topic.doneCount}
        aria-valuemin={0}
        aria-valuemax={topic.totalCount}
        aria-label={`${topic.doneCount} of ${topic.totalCount} complete`}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", complete ? theme.progressComplete : theme.progress)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function PassageRow({ passage, theme }: { passage: PracticePassageItem; theme: SubjectTheme }) {
  const pct =
    passage.totalCount > 0 ? Math.min(100, (passage.doneCount / passage.totalCount) * 100) : 0;
  const complete = passage.totalCount > 0 && passage.leftCount === 0;

  return (
    <Link
      href={`/student/passages/${passage.id}?grade=${passage.gradeLevel}`}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-transparent px-3 py-2.5 transition-all",
        theme.rowHover,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={cn("block text-sm font-medium text-slate-800 leading-snug", theme.rowTitleHover)}>
            {passage.title}
          </span>
          {passage.subtitle && (
            <span className="mt-0.5 block text-xs text-slate-400 truncate">{passage.subtitle}</span>
          )}
        </div>
        <ProgressPill done={passage.doneCount} total={passage.totalCount} theme={theme} />
      </div>
      <div
        className="h-1 rounded-full bg-white/80 ring-1 ring-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={passage.doneCount}
        aria-valuemin={0}
        aria-valuemax={passage.totalCount}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", complete ? theme.progressComplete : theme.progress)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function resolveInitialSubject(
  subjects: SubjectCatalog[],
  highlightSubject?: string | null,
): string {
  if (highlightSubject) {
    const filter = highlightSubject.toLowerCase();
    const match = subjects.find((s) => {
      const key = s.subjectKey.toLowerCase();
      if (filter.includes("math")) return key.includes("math");
      if (filter.includes("english") || filter.includes("ela")) return isEnglishSubject(key);
      return key.includes(filter);
    });
    if (match) return match.subjectKey;
  }
  return subjects[0]?.subjectKey ?? "";
}

export function PracticeTopicCatalog({
  catalog,
  highlightSubject,
}: {
  catalog: PracticeGradeGroup[];
  highlightSubject?: string | null;
}) {
  const subjects = useMemo(() => pivotCatalog(catalog), [catalog]);
  const [activeSubject, setActiveSubject] = useState(() =>
    resolveInitialSubject(subjects, highlightSubject),
  );

  if (subjects.length === 0) {
    return (
      <p className="text-slate-600 text-base leading-relaxed">
        No approved practice topics yet. Ask your admin to upload and approve PDF problems.
      </p>
    );
  }

  const current = subjects.find((s) => s.subjectKey === activeSubject) ?? subjects[0]!;
  const theme = subjectTheme(current.subjectKey);
  const stats = subjectStats(current);

  return (
    <div className="space-y-5">
      {subjects.length > 1 && (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Choose subject"
        >
          {subjects.map((subject) => {
            const s = subjectStats(subject);
            const active = subject.subjectKey === current.subjectKey;
            const t = subjectTheme(subject.subjectKey);
            return (
              <button
                key={subject.subjectKey}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSubject(subject.subjectKey)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-left transition-all min-w-[8.5rem]",
                  active ? t.tabActive : t.tabIdle,
                )}
              >
                <span className="block text-sm font-semibold">{subject.label}</span>
                <span
                  className={cn(
                    "block text-[11px] tabular-nums mt-0.5",
                    active ? "text-white/80" : "text-slate-400",
                  )}
                >
                  {s.topics} topics · {s.done}/{s.total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section
        role="tabpanel"
        aria-label={current.label}
        className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden"
      >
        <div className={cn("border-b border-slate-100 px-5 py-4", theme.domainBg)}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{current.label}</h2>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {current.grades.length} grade{current.grades.length === 1 ? "" : "s"} · {stats.topics}{" "}
                topics · {stats.done}/{stats.total} done
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {current.grades.map((grade, gradeIndex) => {
            const gStats = gradeStats(grade);

            return (
              <details
                key={grade.gradeLevel}
                open={gradeIndex === 0}
                className="group/grade"
              >
                <summary
                  className={cn(
                    "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5",
                    "hover:bg-slate-50/70 transition-colors",
                    "[&::-webkit-details-marker]:hidden",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                        theme.iconBg,
                        theme.iconText,
                      )}
                      aria-hidden
                    >
                      {grade.gradeLevel > 0 ? grade.gradeLevel : "·"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{grade.label}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {gStats.topics} topics · {gStats.done}/{gStats.total} done
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-300 text-[10px] shrink-0 group-open/grade:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>

                <div className="px-4 pb-5 pt-1 space-y-4 bg-slate-50/50">
                  {grade.passages && grade.passages.length > 0 && (
                    <div
                      className={cn(
                        "rounded-xl border p-3 sm:p-4",
                        theme.domainBorder,
                        theme.domainBg,
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
                        Reading passages
                      </p>
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {grade.passages.map((passage) => (
                          <li key={passage.id}>
                            <PassageRow passage={passage} theme={theme} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {grade.domains.map((domainGroup) => (
                    <div
                      key={domainGroup.domain}
                      className={cn(
                        "rounded-xl border p-3 sm:p-4",
                        theme.domainBorder,
                        theme.domainBg,
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
                        {formatDomainLabel(domainGroup.domain)}
                      </p>
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {domainGroup.topics.map((topic) => (
                          <li key={`${topic.id}-${topic.gradeLevel}`}>
                            <TopicRow topic={topic} theme={theme} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
