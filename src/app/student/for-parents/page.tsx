import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import {
  getStudentActiveDates,
  getStudentDailyWork,
  getStudentParentFeedback,
} from "@/lib/analytics";
import { getCurriculumRoadmaps } from "@/lib/curriculum-roadmap";
import { getSatFoundationProgress } from "@/lib/sat-readiness";
import { StudentNav } from "@/components/layouts/StudentNav";
import { CurriculumRoadmap } from "@/components/CurriculumRoadmap";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar, StatBox } from "@/components/ui/Badge";
import {
  WorkQualityBadge,
  resolveAttemptWorkQuality,
} from "@/components/WorkQualityBadge";
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

  const [
    { analytics, weeklyReport, todayMinutes, reviewDue },
    dailyWork,
    activeDates,
    curriculumRoadmap,
    satFoundation,
  ] = await Promise.all([
    getStudentParentFeedback(session.user.studentProfileId),
    getStudentDailyWork(session.user.studentProfileId, selectedDate),
    getStudentActiveDates(session.user.studentProfileId),
    getCurriculumRoadmaps(session.user.studentProfileId),
    getSatFoundationProgress(session.user.studentProfileId),
  ]);

  const {
    student: profile,
    weekMinutes,
    monthMinutes,
    todayCompleted,
    overallAccuracy,
    medianTime,
    masteredCount,
    weaknesses,
    recentSessions,
  } = analytics;

  const dailyGoalProgress = Math.min(
    (todayMinutes / profile.dailyGoalMinutes) * 100,
    100,
  );

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

        <CurriculumRoadmap data={curriculumRoadmap} />

        <Card className="border-violet-200 bg-gradient-to-br from-violet-50/80 to-white/95">
          <CardTitle>Long-Term Readiness</CardTitle>
          <p className="text-sm text-slate-600 mt-1">{satFoundation.schoolReadinessLabel}</p>
          <p className="text-sm text-slate-600 mt-1">{satFoundation.confidenceLabel}</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>SAT foundation skills</span>
              <span>{satFoundation.overallFoundationPercent}%</span>
            </div>
            <ProgressBar value={satFoundation.overallFoundationPercent} />
          </div>
          {satFoundation.domains.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {satFoundation.domains.slice(0, 6).map((domain) => (
                <div
                  key={domain.domain}
                  className="rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-800">{domain.domain}</p>
                  <p className="text-slate-500">
                    {domain.masteredSkills}/{domain.totalSkills} skills building ·{" "}
                    {domain.percentReady}% ready
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">{satFoundation.disclaimer}</p>
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
              value={String(dailyWork.sessions.length)}
              sub={`${dailyWork.sessionsCompleted} completed`}
              accent="amber"
            />
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

          {dailyWork.skillsWorked.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Skills that day</p>
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
              Problems ({dailyWork.attempts.length})
            </p>
            <div className="mt-2 space-y-2">
              {dailyWork.attempts.length === 0 ? (
                <p className="text-slate-500 text-sm">No work on this date.</p>
              ) : (
                dailyWork.attempts.map((a) => {
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
                })
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox
            label="Today"
            value={`${Math.round(todayMinutes)} min`}
            sub={`Goal: ${profile.dailyGoalMinutes} min`}
            accent="indigo"
          />
          <StatBox
            label="This Week"
            value={`${Math.round(weekMinutes)} min`}
            sub={`${weeklyReport.daysActive}/7 days active`}
            accent="emerald"
          />
          <StatBox
            label="This Month"
            value={`${Math.round(monthMinutes)} min`}
            accent="amber"
          />
          <StatBox
            label="Accuracy"
            value={formatPercent(overallAccuracy)}
            sub={`${masteredCount} skills mastered`}
            accent="rose"
          />
        </div>

        <Card>
          <CardTitle>Today&apos;s Practice Time</CardTitle>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                {Math.round(todayMinutes)} of {profile.dailyGoalMinutes} minutes
              </span>
              <span>{Math.round(dailyGoalProgress)}%</span>
            </div>
            <ProgressBar value={dailyGoalProgress} />
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <Card>
            <CardTitle>This Week at a Glance</CardTitle>
            <dl className="mt-3 space-y-3 text-sm">
              <Row label="Sessions completed" value={weeklyReport.sessionsCompleted} />
              <Row
                label="Problems attempted"
                value={weeklyReport.problemsAttempted}
              />
              <Row
                label="Weekly accuracy"
                value={formatPercent(weeklyReport.accuracy)}
              />
              <Row label="XP earned (total)" value={profile.xp} />
              <Row
                label="Median time per problem"
                value={`${medianTime.toFixed(1)}s`}
              />
            </dl>
          </Card>

          <Card>
            <CardTitle>Ahead-of-School Goal</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Daily practice is designed to keep them working ahead of their class.
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <Row
                label="School grade"
                value={gradeLabel(profile.schoolGrade)}
              />
              <Row
                label="Target ahead"
                value={`${profile.targetAheadMonths} grade levels`}
              />
              <Row
                label="Mastered skills"
                value={masteredCount}
              />
            </dl>
          </Card>
        </div>

        <Card>
          <CardTitle>What to Work On</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Skills that need the most attention right now.
          </p>
          {weaknesses.length === 0 ? (
            <p className="text-slate-500 mt-3">
              No weak areas flagged yet — keep practicing!
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {weaknesses.map((w) => (
                <div
                  key={w.skillId}
                  className="rounded-xl border border-rose-100 bg-rose-50/80 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-rose-950">{w.skillTitle}</p>
                    {w.overdueReview && (
                      <Badge variant="warning">Review overdue</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {w.subjectName} · {formatPercent(w.accuracy)} accuracy · avg{" "}
                    {w.medianSeconds.toFixed(0)}s per problem
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Recent Sessions</CardTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2 pr-2">Date</th>
                  <th className="pb-2 pr-2">Type</th>
                  <th className="pb-2 pr-2">Time</th>
                  <th className="pb-2 pr-2">Accuracy</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-500">
                      No sessions yet.
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        {s.startedAt.toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-2">
                        {SESSION_LABELS[s.sessionType] ?? s.sessionType}
                      </td>
                      <td className="py-2 pr-2">
                        {formatMinutes(s.activeSeconds)}
                      </td>
                      <td className="py-2 pr-2">
                        {s.accuracy != null ? formatPercent(s.accuracy) : "—"}
                      </td>
                      <td className="py-2">
                        <Badge variant={s.completed ? "success" : "default"}>
                          {s.completed ? "Done" : "In progress"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
