import { Card, CardTitle } from "@/components/ui/Card";
import {
  groupRecentPracticesByDate,
  type RecentPracticeSummary,
} from "@/lib/recent-practice-summaries";

export function RecentPracticeSection({
  practices,
}: {
  practices: RecentPracticeSummary[];
}) {
  const byDate = groupRecentPracticesByDate(practices);

  return (
    <Card>
      <CardTitle>Recent practice</CardTitle>
      {byDate.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">No practice sessions yet.</p>
      ) : (
        <div className="mt-5 space-y-6">
          {byDate.map((group) => (
            <section key={group.dateKey}>
              <h3 className="text-sm font-semibold text-slate-700">{group.heading}</h3>
              <ul className="mt-2 space-y-2">
                {group.items.map((practice) => (
                  <li
                    key={practice.id}
                    className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-900 leading-snug">{practice.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {practice.subjectName} · {practice.sourceLabel}
                    </p>
                    <p className="text-slate-700 mt-1.5">
                      {practice.doneCount} done · {practice.correctCount} right ·{" "}
                      {practice.wrongOrSkippedCount} wrong/skipped
                    </p>
                    <p className="text-indigo-600 font-semibold mt-1">+{practice.xpEarned} XP</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
