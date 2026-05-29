import Link from "next/link";
import { formatPracticeSubjectLabel, type PracticeGradeGroup, type PracticeTopicItem } from "@/lib/pdf-practice/selection";
import { cn } from "@/lib/utils";

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

function subjectAccent(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("english") || s.includes("ela")) return "border-violet-300";
  if (s.includes("math")) return "border-indigo-300";
  return "border-slate-300";
}

function TopicRow({ topic }: { topic: PracticeTopicItem }) {
  const pct =
    topic.totalCount > 0 ? Math.min(100, (topic.doneCount / topic.totalCount) * 100) : 0;
  const complete = topic.totalCount > 0 && topic.leftCount === 0;

  return (
    <Link
      href={`/student/concepts/${topic.slug}?grade=${topic.gradeLevel}`}
      className={cn(
        "group block rounded-lg border border-transparent px-3 py-2.5",
        "hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[15px] leading-snug text-slate-800 group-hover:text-indigo-700">
          {topic.name}
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full",
            complete
              ? "bg-emerald-50 text-emerald-700"
              : topic.doneCount > 0
                ? "bg-indigo-50 text-indigo-700"
                : "bg-slate-100 text-slate-500",
          )}
        >
          {complete ? "Done" : `${topic.doneCount}/${topic.totalCount}`}
        </span>
      </div>
      <div
        className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={topic.doneCount}
        aria-valuemin={0}
        aria-valuemax={topic.totalCount}
        aria-label={`${topic.doneCount} of ${topic.totalCount} complete`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            complete ? "bg-emerald-500" : "bg-indigo-400/90",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400 tabular-nums">
        {topic.totalCount} total · {topic.doneCount} done · {topic.leftCount} left
      </p>
    </Link>
  );
}

function gradeStats(grade: PracticeGradeGroup, subjects: PracticeGradeGroup["subjects"]) {
  let topics = 0;
  let total = 0;
  let done = 0;
  for (const subject of subjects) {
    for (const domain of subject.domains) {
      topics += domain.topics.length;
      for (const t of domain.topics) {
        total += t.totalCount;
        done += t.doneCount;
      }
    }
  }
  return { topics, total, done, left: Math.max(0, total - done) };
}

export function PracticeTopicCatalog({
  catalog,
  highlightSubject,
}: {
  catalog: PracticeGradeGroup[];
  highlightSubject?: string | null;
}) {
  if (catalog.length === 0) {
    return (
      <p className="text-slate-600 text-base leading-relaxed">
        No approved practice topics yet. Ask your admin to upload and approve PDF problems.
      </p>
    );
  }

  const subjectFilter = highlightSubject?.toLowerCase() ?? null;

  function matchesSubjectFilter(subjectKey: string): boolean {
    if (!subjectFilter) return true;
    const s = subjectKey.toLowerCase();
    if (subjectFilter.includes("math")) return s.includes("math");
    if (subjectFilter.includes("english") || subjectFilter.includes("ela")) {
      return s.includes("english") || s.includes("ela") || s.includes("reading");
    }
    return s.includes(subjectFilter);
  }

  const visibleGrades = catalog
    .map((grade) => ({
      grade,
      subjects: grade.subjects.filter((s) => matchesSubjectFilter(s.subject)),
    }))
    .filter((g) => g.subjects.length > 0);

  return (
    <div className="space-y-4">
      {visibleGrades.length > 1 && (
        <nav
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
          aria-label="Jump to grade"
        >
          {visibleGrades.map(({ grade }) => (
            <a
              key={grade.gradeLevel}
              href={`#grade-${grade.gradeLevel}`}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700 shadow-sm"
            >
              {grade.label}
            </a>
          ))}
        </nav>
      )}

      {visibleGrades.map(({ grade, subjects }, gradeIndex) => {
        const stats = gradeStats(grade, subjects);

        return (
          <details
            key={grade.gradeLevel}
            id={`grade-${grade.gradeLevel}`}
            open={gradeIndex === 0}
            className="group/grade scroll-mt-24 rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm overflow-hidden"
          >
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 sm:px-5",
                "hover:bg-slate-50/80 transition-colors",
                "[&::-webkit-details-marker]:hidden",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold"
                  aria-hidden
                >
                  {grade.gradeLevel > 0 ? grade.gradeLevel : "·"}
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">{grade.label}</h2>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {stats.topics} topics · {stats.done}/{stats.total} done
                  </p>
                </div>
              </div>
              <span className="text-slate-400 text-xs shrink-0 group-open/grade:rotate-180 transition-transform">
                ▼
              </span>
            </summary>

            <div className="border-t border-slate-100 px-3 pb-4 pt-2 sm:px-4 space-y-6">
              {subjects.map((subject) => (
                <section
                  key={`${grade.gradeLevel}-${subject.subject}`}
                  className={cn("border-l-2 pl-4", subjectAccent(subject.subject))}
                >
                  <h3 className="text-sm font-semibold text-slate-800">
                    {formatPracticeSubjectLabel(subject.subject)}
                  </h3>

                  <div className="mt-3 space-y-4">
                    {subject.domains.map((domainGroup) => (
                      <div key={domainGroup.domain}>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                          {formatDomainLabel(domainGroup.domain)}
                        </p>
                        <ul className="grid gap-0.5 sm:grid-cols-2 sm:gap-x-2">
                          {domainGroup.topics.map((topic) => (
                            <li key={`${topic.id}-${topic.gradeLevel}`}>
                              <TopicRow topic={topic} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
