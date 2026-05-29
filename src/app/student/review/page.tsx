import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import {
  formatMistakeDayLabel,
  getMistakeDayGroups,
  getMistakesForReview,
} from "@/lib/review";
import { getActiveSubjectId, getPlacementForSubject } from "@/lib/student-subject";
import { StudentNav } from "@/components/layouts/StudentNav";
import { MarkMistakeDayReviewedButton } from "@/components/student/MarkMistakeDayReviewedButton";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; day?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const params = await searchParams;
  const student = await getStudentByUserId(session.user.id);
  const activeSubjectId = await getActiveSubjectId(session.user.studentProfileId);
  const subjectId = params.subjectId ?? activeSubjectId ?? undefined;

  const subject = subjectId
    ? await prisma.subject.findUnique({ where: { id: subjectId } })
    : null;

  const placement = subjectId
    ? await getPlacementForSubject(session.user.studentProfileId, subjectId)
    : null;

  const selectedDay = params.day;
  const [mistakeDays, mistakes] = await Promise.all([
    subjectId
      ? getMistakeDayGroups(session.user.studentProfileId, subjectId)
      : Promise.resolve([]),
    getMistakesForReview(
      session.user.studentProfileId,
      selectedDay ? 50 : 10,
      subjectId,
      selectedDay,
    ),
  ]);

  const selectedDayGroup = selectedDay
    ? mistakeDays.find((day) => day.dateKey === selectedDay)
    : null;

  return (
    <div className="min-h-[100dvh] pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <Card>
          <CardTitle className="text-2xl">
            Review — {subject?.name ?? placement?.subject.name ?? "All subjects"}
          </CardTitle>
          <p className="text-slate-500 mt-1">
            Fix mistakes day by day and keep mastered skills sharp.
          </p>
        </Card>

        {subjectId && (
          <Card>
            <CardTitle>Mistakes by Day</CardTitle>
            {mistakeDays.length === 0 ? (
              <p className="text-slate-500 mt-2">No recent mistakes in the last 7 days.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {mistakeDays.map((day) => (
                  <div
                    key={day.dateKey}
                    className={`flex items-center justify-between rounded-xl p-3 ${
                      day.reviewed
                        ? "bg-slate-50 border border-slate-100"
                        : selectedDay === day.dateKey
                          ? "bg-rose-100 border border-rose-200"
                          : "bg-rose-50"
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${day.reviewed ? "text-slate-500" : "text-slate-900"}`}>
                        {day.label}
                      </p>
                      <p className="text-sm text-slate-500">
                        {day.count} mistake{day.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {day.reviewed ? (
                        <Badge variant="success">Reviewed</Badge>
                      ) : (
                        <Link
                          href={`/student/review?subjectId=${subjectId}&day=${day.dateKey}`}
                        >
                          <Badge variant="warning">Review</Badge>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card>
          <CardTitle>
            {selectedDay
              ? `Mistakes — ${formatMistakeDayLabel(selectedDay)}`
              : "Recent Mistakes"}
          </CardTitle>
          {selectedDay && subjectId && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <MarkMistakeDayReviewedButton
                subjectId={subjectId}
                dateKey={selectedDay}
                reviewed={selectedDayGroup?.reviewed ?? false}
              />
              <Link
                href={`/student/review?subjectId=${subjectId}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                View all days
              </Link>
            </div>
          )}
          {mistakes.length === 0 ? (
            <p className="text-slate-500 mt-2">
              {selectedDay ? "No mistakes on this day." : "No recent mistakes!"}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {mistakes.map((mistake) => (
                <div
                  key={mistake.id}
                  className="rounded-xl border border-rose-100 bg-rose-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-sm text-rose-800">{mistake.topicLabel}</p>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {mistake.source === "pdf" ? "Topic practice" : "Lesson bank"}
                    </span>
                  </div>
                  {mistake.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mistake.imageUrl}
                      alt="Problem"
                      className="mt-2 max-h-48 w-full rounded-lg border border-rose-100 bg-white object-contain"
                    />
                  ) : null}
                  <p className="mt-2 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {mistake.prompt}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Your answer:</span>{" "}
                    {mistake.userAnswer}
                  </p>
                  {mistake.explanation && (
                    <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
                      ✓ {mistake.explanation}
                    </p>
                  )}
                  {mistake.practiceHref && (
                    <Link
                      href={mistake.practiceHref}
                      className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Practice this topic again →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
