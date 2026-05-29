import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import {
  getStudentActiveDates,
  getStudentDailyWork,
} from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { StudentNav } from "@/components/layouts/StudentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar, StatBox } from "@/components/ui/Badge";
import {
  WorkQualityBadge,
  resolveAttemptWorkQuality,
} from "@/components/WorkQualityBadge";
import { ParentPdfAttemptCard } from "@/components/ParentPdfAttemptCard";
import { formatMinutes, formatPercent, gradeLabel, todayDateKey } from "@/lib/utils";
import Link from "next/link";
import { DateNavigator } from "./DateNavigator";

const SESSION_LABELS: Record<string, string> = {
  DAILY_MISSION: "Daily Mission",
  PRACTICE: "Practice",
  REVIEW: "Review",
  MASTERY_CHALLENGE: "Challenge",
  DIAGNOSTIC: "Diagnostic",
};

export default async function ForParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  if (!student) redirect("/login");

  const { date: dateParam } = await searchParams;
  const selectedDate = dateParam ?? todayDateKey();

  const studentId = session.user.studentProfileId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [dailyWork, activeDates, profile, todayCompleted, reviewDue] =
    await Promise.all([
      getStudentDailyWork(studentId, selectedDate),
      getStudentActiveDates(studentId),
      prisma.studentProfile.findUniqueOrThrow({
        where: { id: studentId },
        select: {
          displayName: true,
          schoolGrade: true,
          streakDays: true,
          dailyGoalMinutes: true,
        },
      }),
      prisma.practiceSession
        .findFirst({
          where: {
            studentId,
            sessionType: "DAILY_MISSION",
            completed: true,
            startedAt: { gte: todayStart },
          },
          select: { id: true },
        })
        .then((s) => Boolean(s)),
      prisma.reviewQueueItem.count({
        where: { studentId, completed: false, dueAt: { lte: new Date() } },
      }),
    ]);

  const selectedDayGoalProgress = Math.min(
    (dailyWork.totalMinutes / profile.dailyGoalMinutes) * 100,
    100,
  );

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={profile.displayName} />
      <main className="mx-auto max-w-4xl px-4 py-3 space-y-5 md:py-4 md:space-y-6">
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/95 to-white/95">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            For Parents
          </p>
          <CardTitle className="text-2xl mt-1">
            {profile.displayName}&apos;s Progress
          </CardTitle>
          <p className="text-slate-600 mt-1">
            {gradeLabel(profile.schoolGrade)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={todayCompleted ? "success" : "warning"}>
              {todayCompleted ? "Today's mission complete" : "Mission not finished today"}
            </Badge>
            <Badge variant="info">{profile.streakDays}-day streak</Badge>
            {reviewDue > 0 && (
              <Badge variant="warning">{reviewDue} skills due for review</Badge>
            )}
          </div>
        </Card>

        <Card className="border-indigo-200">
          <CardTitle>Daily Work Review</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Pick a date to see what they did, review scratch-pad strokes, and read
            a daily summary.
          </p>
          <div className="mt-4">
            <DateNavigator
              currentDate={selectedDate}
              activeDates={activeDates}
            />
          </div>

          <div className="mt-5 rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
            <p className="text-sm font-semibold text-indigo-900">
              {dailyWork.displayDate}
            </p>
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">
              {dailyWork.narrative}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox
              label="Practice time"
              value={`${Math.round(dailyWork.totalMinutes)} min`}
              sub={`Goal: ${profile.dailyGoalMinutes} min`}
              accent="indigo"
            />
            <StatBox
              label="Problems"
              value={String(dailyWork.problemsAttempted)}
              sub={
                dailyWork.accuracy != null
                  ? `${dailyWork.problemsCorrect} correct · ${formatPercent(dailyWork.accuracy)}`
                  : "No attempts"
              }
              accent="emerald"
            />
            <StatBox
              label="Sessions"
              value={String(dailyWork.sessionCount)}
              sub={
                dailyWork.pdfTopicSessionCount > 0 && dailyWork.sessions.length === 0
                  ? `${dailyWork.pdfTopicSessionCount} topic practice`
                  : dailyWork.pdfTopicSessionCount > 0
                    ? `${dailyWork.pdfTopicSessionCount} topic · ${dailyWork.sessions.length} lesson bank`
                    : `${dailyWork.sessionsCompleted} completed`
              }
              accent="amber"
            />
            {(dailyWork.attempts.length > 0 ||
              dailyWork.pdfAttempts.length > 0 ||
              dailyWork.scratchWorkShowed > 0 ||
              dailyWork.scratchWorkRequiredMissing > 0) && (
              <StatBox
                label="Scratch work"
                value={String(dailyWork.scratchWorkShowed)}
                sub={
                  dailyWork.scratchWorkRequiredMissing > 0
                    ? `${dailyWork.scratchWorkRequiredMissing} missing`
                    : "Captured"
                }
                accent="rose"
              />
            )}
          </div>

          {dailyWork.problemsAttempted > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Daily goal progress</span>
                <span>{Math.round(selectedDayGoalProgress)}%</span>
              </div>
              <ProgressBar value={selectedDayGoalProgress} />
            </div>
          )}

          {dailyWork.missionComplete && (
            <Badge variant="success" className="mt-3">
              Daily mission completed
            </Badge>
          )}

          {dailyWork.topicsWorked.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Topics that day</p>
              <div className="mt-2 space-y-2">
                {dailyWork.topicsWorked.map((topic) => (
                  <div
                    key={topic.conceptId}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{topic.title}</p>
                      <p className="text-slate-500 text-xs">{topic.subjectLabel}</p>
                    </div>
                    <p className="text-slate-600">
                      {topic.correct}/{topic.total} correct
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dailyWork.skillsWorked.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Lesson bank skills</p>
              <div className="mt-2 space-y-2">
                {dailyWork.skillsWorked.map((skill) => (
                  <div
                    key={skill.skillId}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{skill.title}</p>
                      <p className="text-slate-500 text-xs">{skill.subjectName}</p>
                    </div>
                    <p className="text-slate-600">
                      {skill.correct}/{skill.total} correct
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dailyWork.sessions.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Sessions</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2 pr-2">Time</th>
                      <th className="pb-2 pr-2">Type</th>
                      <th className="pb-2 pr-2">Duration</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyWork.sessions.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2">
                          {s.startedAt.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-2">
                          {SESSION_LABELS[s.sessionType] ?? s.sessionType}
                        </td>
                        <td className="py-2 pr-2">
                          {formatMinutes(s.activeSeconds)}
                        </td>
                        <td className="py-2">
                          <Badge variant={s.completed ? "success" : "default"}>
                            {s.completed ? "Done" : "In progress"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-800">
              Problems ({dailyWork.problemsAttempted})
            </p>
            {dailyWork.pdfAttempts.length > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                Tap a problem to see the full question, your child&apos;s answer, and
                scratch work.
              </p>
            )}
            <div className="mt-2 space-y-2">
              {dailyWork.problemsAttempted === 0 ? (
                <p className="text-slate-500 text-sm">No work on this date.</p>
              ) : (
                <>
                  {dailyWork.pdfAttempts.map((a) => (
                    <ParentPdfAttemptCard
                      key={a.id}
                      attempt={a}
                      selectedDate={selectedDate}
                    />
                  ))}
                  {dailyWork.attempts.map((a) => {
                    const quality = resolveAttemptWorkQuality(a);
                    return (
                      <Link
                        key={a.id}
                        href={`/student/for-parents/work/${a.id}?date=${selectedDate}`}
                        className="block rounded-xl bg-slate-50/80 p-3 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                      >
                        <div className="flex justify-between gap-2">
                          <p className="font-medium text-sm">
                            {a.problem.skill.title}
                            <span className="text-slate-400 font-normal">
                              {" "}
                              · {a.problem.skill.subject.name}
                            </span>
                          </p>
                          <span
                            className={
                              a.isCorrect ? "text-emerald-600" : "text-rose-600"
                            }
                          >
                            {a.isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {a.problem.prompt}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <p className="text-xs text-slate-400">
                            {a.createdAt.toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            · {a.elapsedSeconds.toFixed(0)}s · Answer: {a.answer}
                          </p>
                          <Badge variant="default">Lesson bank</Badge>
                          <WorkQualityBadge
                            quality={quality}
                            requiresScratchpad={a.problem.requiresScratchpad}
                          />
                          {a.strokes && (
                            <Badge variant="info">Strokes saved</Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
