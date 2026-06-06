"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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

type SubjectAccent = {
  tab: string;
  tabActive: string;
  ring: string;
  bar: string;
  chip: string;
};

function isEnglishSubject(subject: string): boolean {
  const s = subject.toLowerCase();
  return s.includes("english") || s.includes("ela") || s.includes("reading");
}

function subjectAccent(subject: string): SubjectAccent {
  if (isEnglishSubject(subject)) {
    return {
      tab: "text-violet-700",
      tabActive: "bg-violet-600 text-white shadow-md shadow-violet-900/20",
      ring: "ring-violet-200/80",
      bar: "bg-violet-500",
      chip: "bg-violet-50 text-violet-800",
    };
  }
  return {
    tab: "text-indigo-700",
    tabActive: "bg-indigo-600 text-white shadow-md shadow-indigo-900/20",
    ring: "ring-indigo-200/80",
    bar: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-800",
  };
}

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

function subjectStats(subject: SubjectCatalog) {
  let topics = 0;
  let total = 0;
  let done = 0;
  for (const grade of subject.grades) {
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
  }
  return { topics, total, done };
}

function topicStatus(done: number, total: number) {
  if (total <= 0) return "empty" as const;
  if (done >= total) return "complete" as const;
  if (done > 0) return "progress" as const;
  return "new" as const;
}

function TopicCard({
  href,
  title,
  subtitle,
  done,
  total,
  accent,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  done: number;
  total: number;
  accent: SubjectAccent;
}) {
  const status = topicStatus(done, total);
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl bg-white/95 px-4 py-3.5 shadow-sm ring-1 transition-all",
        "hover:shadow-md hover:-translate-y-0.5",
        status === "complete"
          ? "ring-emerald-200/90 hover:ring-emerald-300"
          : cn(accent.ring, "hover:ring-slate-300"),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 leading-snug group-hover:text-slate-950">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
        {status === "complete" ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Done
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
              status === "progress" ? accent.chip : "bg-slate-100 text-slate-500",
            )}
          >
            {status === "new" ? `${total} problems` : `${done} of ${total}`}
          </span>
        )}
      </div>
      {status === "progress" && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className={cn("h-full rounded-full transition-[width]", accent.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
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
  const [openGrade, setOpenGrade] = useState<number | null>(null);

  if (subjects.length === 0) {
    return (
      <p className="rounded-2xl bg-white/95 px-5 py-4 text-slate-600 text-sm leading-relaxed shadow-sm ring-1 ring-white/80">
        No approved practice topics yet. Ask your admin to upload and approve PDF problems.
      </p>
    );
  }

  const current = subjects.find((s) => s.subjectKey === activeSubject) ?? subjects[0]!;
  const accent = subjectAccent(current.subjectKey);
  const stats = subjectStats(current);
  const pctDone = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const defaultOpenGrade = current.grades[0]?.gradeLevel ?? null;
  const expandedGrade = openGrade ?? defaultOpenGrade;

  return (
    <div className="space-y-6">
      {subjects.length > 1 && (
        <div
          className="grid grid-cols-2 gap-2 rounded-2xl bg-white/40 p-1.5 ring-1 ring-white/60 backdrop-blur-sm"
          role="tablist"
          aria-label="Choose subject"
        >
          {subjects.map((subject) => {
            const s = subjectStats(subject);
            const active = subject.subjectKey === current.subjectKey;
            const a = subjectAccent(subject.subjectKey);
            return (
              <button
                key={subject.subjectKey}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveSubject(subject.subjectKey);
                  setOpenGrade(null);
                }}
                className={cn(
                  "rounded-xl px-4 py-3 text-left transition-all",
                  active ? a.tabActive : "bg-white/70 text-slate-700 hover:bg-white",
                )}
              >
                <span className="block text-base font-semibold">{subject.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs tabular-nums",
                    active ? "text-white/85" : "text-slate-500",
                  )}
                >
                  {s.topics} topics
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div
        role="tabpanel"
        aria-label={current.label}
        className="rounded-2xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-white/80 backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cn("text-sm font-semibold", accent.tab)}>{current.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{pctDone}%</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.done} of {stats.total} problems completed
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {current.grades.length} grade{current.grades.length === 1 ? "" : "s"} · {stats.topics}{" "}
            topics
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-[width]", accent.bar)}
            style={{ width: `${pctDone}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {current.grades.map((grade) => {
          const isOpen = expandedGrade === grade.gradeLevel;
          let topicCount = 0;
          if (grade.passages?.length) topicCount += grade.passages.length;
          for (const d of grade.domains) topicCount += d.topics.length;

          return (
            <div
              key={grade.gradeLevel}
              className="overflow-hidden rounded-2xl bg-white/92 shadow-sm ring-1 ring-white/80"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenGrade(isOpen ? null : grade.gradeLevel)
                }
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white transition-colors"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{grade.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{topicCount} topics</p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-slate-400 transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-8">
                  {grade.passages && grade.passages.length > 0 && (
                    <section>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">
                        Reading passages
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {grade.passages.map((passage) => (
                          <li key={passage.id}>
                            <TopicCard
                              href={`/student/passages/${passage.id}?grade=${passage.gradeLevel}`}
                              title={passage.title}
                              subtitle={passage.subtitle}
                              done={passage.doneCount}
                              total={passage.totalCount}
                              accent={accent}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {grade.domains.map((domainGroup) => (
                    <section key={domainGroup.domain}>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">
                        {formatDomainLabel(domainGroup.domain)}
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {domainGroup.topics.map((topic) => (
                          <li key={`${topic.id}-${topic.gradeLevel}`}>
                            <TopicCard
                              href={`/student/concepts/${topic.slug}?grade=${topic.gradeLevel}`}
                              title={topic.name}
                              done={topic.doneCount}
                              total={topic.totalCount}
                              accent={accent}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
