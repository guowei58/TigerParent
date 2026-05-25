import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getStudentAnalytics } from "@/lib/analytics";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, StatBox } from "@/components/ui/Badge";
import Link from "next/link";
import { formatPercent, gradeLabel, formatMinutes } from "@/lib/utils";

export default async function ParentStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const { studentId } = await params;
  const analytics = await getStudentAnalytics(studentId);
  if (!analytics) notFound();

  const { student, weekMinutes, monthMinutes, todayCompleted, overallAccuracy, medianTime, masteredCount, weaknesses, recentSessions, placements } = analytics;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/parent" className="text-indigo-600 hover:underline">Dashboard</Link>
          <span className="text-slate-400">/</span>
          <span>{student.displayName}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{student.displayName}</h1>
            <p className="text-slate-500">{gradeLabel(student.schoolGrade)}</p>
          </div>
          <Badge variant={todayCompleted ? "success" : "warning"}>
            {todayCompleted ? "Completed today" : "Not completed today"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Week Minutes" value={Math.round(weekMinutes)} accent="indigo" />
          <StatBox label="Month Minutes" value={Math.round(monthMinutes)} accent="emerald" />
          <StatBox label="Accuracy" value={formatPercent(overallAccuracy)} accent="amber" />
          <StatBox label="Mastered Skills" value={masteredCount} accent="rose" />
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
          <NavLink href={`/parent/student/${studentId}/pop-quiz`} label="Pop Quiz" />
          <NavLink href={`/parent/student/${studentId}/placement`} label="Placement" />
          <NavLink href={`/parent/student/${studentId}/sessions`} label="Sessions" />
          <NavLink href={`/parent/student/${studentId}/skills`} label="Skills" />
          <NavLink href={`/parent/student/${studentId}/work`} label="Work Review" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardTitle>Subject Placement</CardTitle>
            <div className="mt-3 space-y-2">
              {placements.map((p) => (
                <div key={p.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold">{p.subject.name}</p>
                  <p className="text-sm text-slate-500">
                    Working: Grade {p.assessedGradeLevel} · {p.currentSkill?.title ?? "—"}
                  </p>
                  <p className={`text-sm ${p.monthsAheadOrBehind >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {p.monthsAheadOrBehind >= 6
                      ? "On track to stay 6+ months ahead ✓"
                      : p.monthsAheadOrBehind >= 0
                        ? `${p.monthsAheadOrBehind} months ahead`
                        : `${Math.abs(p.monthsAheadOrBehind)} months behind`}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Top Focus Areas</CardTitle>
            {weaknesses.length === 0 ? (
              <p className="text-slate-500 mt-2">No weak areas identified yet</p>
            ) : (
              <div className="mt-3 space-y-2">
                {weaknesses.map((w) => (
                  <div key={w.skillId} className="rounded-xl bg-rose-50 p-3 text-sm">
                    <p className="font-medium">{w.skillTitle}</p>
                    <p className="text-slate-500">{w.subjectName} · {formatPercent(w.accuracy)} accuracy</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle>Recent Sessions</CardTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Accuracy</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2">{s.startedAt.toLocaleDateString()}</td>
                    <td>{s.sessionType}</td>
                    <td>{formatMinutes(s.activeSeconds)}</td>
                    <td>{s.accuracy != null ? formatPercent(s.accuracy) : "—"}</td>
                    <td>
                      <Badge variant={s.completed ? "success" : "default"}>
                        {s.completed ? "Done" : "In progress"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-sm text-slate-500">
          Median time per problem: {medianTime.toFixed(1)}s · Streak: {student.streakDays} days · XP: {student.xp}
        </p>
      </main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-center font-medium hover:border-indigo-300">
      {label}
    </Link>
  );
}
