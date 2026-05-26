import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentDashboard } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar, StatBox } from "@/components/ui/Badge";
import { getStudentWorkQueue } from "@/lib/assignments/daily-planner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getActiveRewardGoals } from "@/lib/leaderboard";
import { buildGoalProgress } from "@/lib/rewards";
import { getSubjectLearningCards } from "@/lib/unit-learning";
import { SubjectLearningCard } from "@/components/student/SubjectLearningCard";
import { gradeLabel } from "@/lib/utils";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const studentId = session.user.studentProfileId;
  const [data, subjectCards, workQueue] = await Promise.all([
    getStudentDashboard(studentId),
    getSubjectLearningCards(studentId),
    getStudentWorkQueue(studentId),
  ]);

  const activeGoalRecords = await getActiveRewardGoals(studentId);
  const studentStats = {
    xp: data.student.xp,
    streakDays: data.student.streakDays,
  };
  const rewardGoals = activeGoalRecords.map((g) =>
    buildGoalProgress(g, studentStats),
  );
  const nextGoal =
    rewardGoals
      .filter((g) => !g.reached)
      .sort((a, b) => a.progressPercent - b.progressPercent)[0] ??
    rewardGoals.find((g) => g.reached && !g.redeemed);

  return (
    <div className="min-h-[100dvh] pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={data.student.displayName} />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="XP" value={data.student.xp} accent="indigo" />
          <StatBox label="Streak" value={`${data.student.streakDays} days`} accent="amber" />
          <StatBox
            label="Daily Goal"
            value={`${data.student.dailyGoalMinutes} min`}
            accent="emerald"
          />
          <StatBox
            label="Grade"
            value={gradeLabel(data.student.schoolGrade)}
            accent="rose"
          />
        </div>

        <Card className="border-2 border-indigo-200 bg-indigo-50/30">
          <CardTitle>Today&apos;s practice plan</CardTitle>
          <p className="text-slate-600 mt-2">
            {workQueue.items.filter((i) => i.assignment.status !== "COMPLETED").length} assignments remaining
          </p>
          <Link href="/student/today" className="inline-block mt-4">
            <Button>Start today&apos;s work →</Button>
          </Link>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {subjectCards.map((card) => (
            <SubjectLearningCard key={card.subjectId} card={card} />
          ))}
        </div>

        {nextGoal && (
          <Card className="border-2 border-amber-200">
            <CardTitle>Reward Goal 🎁</CardTitle>
            <p className="text-lg font-semibold text-indigo-800 mt-2">
              {nextGoal.title}
            </p>
            {nextGoal.cashLabel && (
              <p className="text-emerald-700 font-bold">{nextGoal.cashLabel}</p>
            )}
            <div className="mt-3">
              <ProgressBar value={nextGoal.progressPercent} />
              <p className="text-sm text-slate-500 mt-1">
                {nextGoal.progressLabel}
                {nextGoal.reached && !nextGoal.redeemed
                  ? " — Goal reached!"
                  : ` · ${Math.round(nextGoal.remaining)} to go`}
              </p>
            </div>
            <Link
              href="/student/rewards"
              className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline"
            >
              View all rewards →
            </Link>
          </Card>
        )}

        {data.student.achievements.length > 0 && (
          <Card>
            <CardTitle>Recent Badges 🏅</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.student.achievements.map((a) => (
                <Badge key={a.id} variant="success">
                  {a.title}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
