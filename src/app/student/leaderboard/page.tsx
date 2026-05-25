import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { getTigerParentLeaderboard } from "@/lib/leaderboard";
import { xpLevel, xpProgressInLevel, xpToNextLevel } from "@/lib/rewards";
import { StudentNav } from "@/components/layouts/StudentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPercent, gradeLabel } from "@/lib/utils";
import Link from "next/link";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  if (!student) redirect("/login");

  const entries = await getTigerParentLeaderboard(session.user.studentProfileId);
  const current = entries.find((e) => e.isCurrentUser);

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student.displayName} />
      <main className="mx-auto max-w-4xl px-4 py-3 space-y-5 md:py-4 md:space-y-6">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/95 to-white/95">
          <CardTitle className="text-2xl">Tiger Leaderboard 🐯</CardTitle>
          <p className="text-slate-600 mt-1">
            See how tigers stack up — rankings combine grade level, XP, accuracy,
            speed, mastery, streak, and weekly practice time.
          </p>
          {current && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge variant="info">Your rank: #{current.rank}</Badge>
              <Badge variant="success">Tiger Level {current.level}</Badge>
              <Badge variant="default">Score: {current.compositeScore}</Badge>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50/90 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Tiger</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Avg Time</th>
                  <th className="px-4 py-3">Mastered</th>
                  <th className="px-4 py-3">Streak</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.studentId}
                    className={`border-t border-slate-100 ${
                      entry.isCurrentUser ? "bg-indigo-50/80 font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {entry.rank === 1
                        ? "🥇"
                        : entry.rank === 2
                          ? "🥈"
                          : entry.rank === 3
                            ? "🥉"
                            : `#${entry.rank}`}
                    </td>
                    <td className="px-4 py-3">
                      {entry.displayName}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-indigo-600">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{gradeLabel(entry.schoolGrade)}</td>
                    <td className="px-4 py-3">Lv {entry.level}</td>
                    <td className="px-4 py-3">{entry.xp}</td>
                    <td className="px-4 py-3">
                      {formatPercent(entry.overallAccuracy)}
                    </td>
                    <td className="px-4 py-3">
                      {entry.medianSeconds.toFixed(1)}s
                    </td>
                    <td className="px-4 py-3">{entry.masteredCount}</td>
                    <td className="px-4 py-3">{entry.streakDays}d</td>
                    <td className="px-4 py-3 font-semibold">
                      {entry.compositeScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {current && (
          <Card>
            <CardTitle>Your Breakdown</CardTitle>
            <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
              <Metric label="Months ahead (avg)" value={`${current.monthsAhead >= 0 ? "+" : ""}${current.monthsAhead.toFixed(1)}`} />
              <Metric label="Weekly practice" value={`${Math.round(current.weekMinutes)} min`} />
              <Metric label="Tiger Level" value={`Level ${xpLevel(student.xp)}`} />
              <Metric label="XP to next level" value={`${xpToNextLevel(student.xp)} XP`} />
              <Metric label="Level progress" value={`${xpProgressInLevel(student.xp)}/${100} XP`} />
            </dl>
            <Link
              href="/student/rewards"
              className="mt-4 inline-block text-indigo-600 font-medium text-sm hover:underline"
            >
              View rewards & parent goals →
            </Link>
          </Card>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50/80 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900 mt-1">{value}</dd>
    </div>
  );
}
