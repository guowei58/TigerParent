import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStudentByUserId } from "@/lib/student";
import { getTigerParentLeaderboard } from "@/lib/leaderboard";
import {
  buildGoalProgress,
  describeXpUses,
  xpLevel,
  xpProgressInLevel,
  xpToNextLevel,
} from "@/lib/rewards";
import { getActiveRewardGoals } from "@/lib/leaderboard";
import { StudentNav } from "@/components/layouts/StudentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import Link from "next/link";

function GoalCard({
  goal,
}: {
  goal: ReturnType<typeof buildGoalProgress>;
}) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white/80 p-4 space-y-2">
      <div className="flex justify-between gap-2">
        <p className="font-semibold text-indigo-900">{goal.title}</p>
        <Badge variant="info">{goal.goalType === "STREAK" ? "Streak" : "XP"}</Badge>
      </div>
      {goal.cashLabel && (
        <p className="text-lg font-bold text-emerald-700">{goal.cashLabel}</p>
      )}
      {goal.description && (
        <p className="text-sm text-slate-600">{goal.description}</p>
      )}
      <div className="flex justify-between text-sm text-indigo-800">
        <span>{goal.progressLabel}</span>
        <span>{Math.round(goal.progressPercent)}%</span>
      </div>
      <ProgressBar value={goal.progressPercent} />
      {goal.reached && !goal.redeemed && (
        <p className="text-sm font-medium text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
          Milestone reached! Ask your parent to claim your reward.
        </p>
      )}
    </div>
  );
}

export default async function RewardsPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  if (!student) redirect("/login");

  const [achievements, masteredCount, activeGoalRecords, leaderboard] =
    await Promise.all([
      prisma.achievement.findMany({
        where: { studentId: session.user.studentProfileId },
        orderBy: { earnedAt: "desc" },
      }),
      prisma.masteryState.count({
        where: { studentId: session.user.studentProfileId, status: "MASTERED" },
      }),
      getActiveRewardGoals(session.user.studentProfileId),
      getTigerParentLeaderboard(session.user.studentProfileId),
    ]);

  const studentStats = { xp: student.xp, streakDays: student.streakDays };
  const activeGoals = activeGoalRecords.map((g) =>
    buildGoalProgress(g, studentStats),
  );
  const streakGoals = activeGoals.filter((g) => g.goalType === "STREAK");
  const xpGoals = activeGoals.filter((g) => g.goalType === "XP");
  const myRank = leaderboard.find((e) => e.isCurrentUser);
  const level = xpLevel(student.xp);

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <Card className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
          <CardTitle className="text-white text-2xl">Your Rewards ⭐</CardTitle>
          <p className="text-4xl font-bold mt-2">{student.xp} XP</p>
          <p className="text-amber-100 mt-1">
            Tiger Level {level} · {student.streakDays}-day streak 🔥
          </p>
          <div className="mt-3">
            <ProgressBar value={xpProgressInLevel(student.xp)} />
            <p className="text-sm text-amber-100 mt-1">
              {xpToNextLevel(student.xp)} XP to Level {level + 1}
            </p>
          </div>
          {myRank && (
            <p className="text-sm text-amber-100 mt-3">
              Tiger Leaderboard rank #{myRank.rank} ·{" "}
              <Link href="/student/leaderboard" className="underline font-medium">
                See all tigers
              </Link>
            </p>
          )}
        </Card>

        {activeGoals.length > 0 ? (
          <Card className="border-2 border-indigo-200 bg-indigo-50/50 space-y-4">
            <CardTitle className="text-indigo-900">Working Toward 🎯</CardTitle>
            {streakGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-indigo-800">Streak milestones</p>
                {streakGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            )}
            {xpGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-indigo-800">XP milestones</p>
                {xpGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <CardTitle>No reward goals yet</CardTitle>
            <p className="text-slate-500 mt-2">
              Ask a parent to set streak and XP rewards in{" "}
              <Link href="/student/settings" className="text-indigo-600 underline">
                Settings
              </Link>
              .
            </p>
          </Card>
        )}

        <Card>
          <CardTitle>What is XP for?</CardTitle>
          <ul className="mt-3 space-y-3">
            {describeXpUses().map((item) => (
              <li key={item.title} className="rounded-xl bg-slate-50/80 p-3">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{item.detail}</p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-slate-500">Streak</p>
            <p className="text-3xl font-bold text-amber-600">{student.streakDays} 🔥</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Skills Mastered</p>
            <p className="text-3xl font-bold text-emerald-600">{masteredCount} 🏆</p>
          </Card>
        </div>

        <Card>
          <CardTitle>Badges & Achievements</CardTitle>
          {achievements.length === 0 ? (
            <p className="text-slate-500 mt-3">Complete practice to earn badges!</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 p-4"
                >
                  <span className="text-3xl">🏅</span>
                  <div>
                    <p className="font-bold">{a.title}</p>
                    <p className="text-sm text-slate-500">{a.description}</p>
                    <Badge variant="default" className="mt-1">
                      {new Date(a.earnedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
