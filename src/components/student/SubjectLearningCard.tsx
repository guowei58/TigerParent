import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SubjectLearningCardData } from "@/lib/unit-learning";
import { cn } from "@/lib/utils";

const subjectAccent: Record<string, { gradient: string; text: string; border: string }> = {
  math: {
    gradient: "from-indigo-600 to-violet-600",
    text: "text-indigo-700",
    border: "border-indigo-300 ring-indigo-200",
  },
  english: {
    gradient: "from-violet-600 to-fuchsia-600",
    text: "text-violet-700",
    border: "border-violet-300 ring-violet-200",
  },
};

function accentFor(subjectName: string) {
  const key = subjectName.toLowerCase();
  return subjectAccent[key] ?? subjectAccent.math;
}

function ReviewStats({ card }: { card: SubjectLearningCardData }) {
  const unreviewedDays = card.mistakeDays.filter((day) => !day.reviewed);

  return (
    <div className="rounded-xl bg-rose-50/80 p-3 pt-1">
      <p className="text-xs font-semibold text-slate-600">Mistakes to Review</p>
      {card.mistakeDays.length === 0 ? (
        <p className="text-sm text-slate-500 mt-2">No recent mistakes</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {card.mistakeDays.map((day) => (
            <li key={day.dateKey} className="flex items-center justify-between gap-2 text-sm">
              <span className={day.reviewed ? "text-slate-400" : "text-slate-700"}>
                {day.label} · {day.count}
              </span>
              {day.reviewed ? (
                <span className="text-xs font-medium text-emerald-700">Reviewed</span>
              ) : (
                <Link
                  href={`/student/review?subjectId=${card.subjectId}&day=${day.dateKey}`}
                  className="text-indigo-600 text-xs font-medium hover:underline whitespace-nowrap"
                >
                  Review →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {unreviewedDays.length > 0 && (
        <Link
          href={`/student/review?subjectId=${card.subjectId}`}
          className="text-indigo-600 text-xs font-medium mt-2 inline-block hover:underline"
        >
          {card.mistakeCount} to review →
        </Link>
      )}
    </div>
  );
}

export function SubjectLearningCard({ card }: { card: SubjectLearningCardData }) {
  const accent = accentFor(card.subjectName);
  const practiceHref = card.currentSkill
    ? card.practiceSessionId
      ? `/student/practice/${card.practiceSessionId}`
      : `/student/practice/new?skillId=${card.currentSkill.id}`
    : null;

  return (
    <Card className="overflow-hidden p-0">
      <div className={cn("bg-gradient-to-r px-5 py-4 text-white", accent.gradient)}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-white text-xl">{card.subjectName}</CardTitle>
            <p className="text-sm text-white/80 mt-0.5">
              Grade {card.gradeLevel}
              {card.currentSkill ? ` · ${card.currentSkill.title}` : ""}
            </p>
          </div>
          <Badge
            variant={card.monthsAheadOrBehind >= 0 ? "success" : "warning"}
            className="bg-white/90"
          >
            {card.monthsAheadOrBehind >= 0 ? "+" : ""}
            {card.monthsAheadOrBehind} mo
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {card.currentSkill ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current unit
              </p>
              <p className={cn("text-2xl font-bold mt-1", accent.text)}>
                {card.currentSkill.title}
              </p>
            </div>

            <div>
              <ProgressBar value={card.progressPercent} />
              <p className="text-sm text-slate-500 mt-1.5">
                {Math.round(card.progressPercent)}% toward mastery
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {practiceHref && (
                <Link href={practiceHref}>
                  <Button size="sm">
                    {card.practiceSessionId ? "Continue Practice" : "Start Practice"}
                  </Button>
                </Link>
              )}
              <Link href={`/student/lesson/${card.currentSkill.id}`}>
                <Button size="sm" variant="secondary">
                  View Lesson
                </Button>
              </Link>
              <Link href={`/student/levels?subjectId=${card.subjectId}`}>
                <Button size="sm" variant="ghost">
                  Lesson Plan
                </Button>
              </Link>
            </div>

            {card.nextSkill && (
              <p className="text-sm text-slate-500">
                Next up:{" "}
                <span className="font-medium text-slate-700">{card.nextSkill.title}</span>
              </p>
            )}

            <ReviewStats card={card} />
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-500">
              Open your lesson plan to pick a unit and start practicing.
            </p>
            <Link href={`/student/levels?subjectId=${card.subjectId}`}>
              <Button size="sm">Open Lesson Plan</Button>
            </Link>

            <ReviewStats card={card} />
          </div>
        )}
      </div>
    </Card>
  );
}
