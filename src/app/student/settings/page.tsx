import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { StudentSettingsForm } from "./StudentSettingsForm";
import { ParentRewardGoalsSection } from "./ParentRewardGoalsSection";
import { StudentNav } from "@/components/layouts/StudentNav";
import { getActiveRewardGoals } from "@/lib/leaderboard";
import { buildGoalProgress } from "@/lib/rewards";

export default async function StudentSettingsPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await prisma.studentProfile.findUnique({
    where: { id: session.user.studentProfileId },
    include: { settings: true },
  });
  if (!student) redirect("/login");

  const onboarding = !(student.settings?.onboardingCompleted ?? true);
  const activeGoalRecords = onboarding
    ? []
    : await getActiveRewardGoals(student.id);
  const activeGoals = activeGoalRecords.map((g) =>
    buildGoalProgress(g, {
      xp: student.xp,
      streakDays: student.streakDays,
    }),
  );

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {onboarding ? (
        <header className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-indigo-200">
            TigerParent
          </p>
          <p className="font-bold text-lg">Set up your profile</p>
        </header>
      ) : (
        <StudentNav displayName={student.displayName} />
      )}
      <main className="mx-auto max-w-lg px-4 py-6 space-y-8">
        <StudentSettingsForm
          initialDisplayName={student.displayName}
          initialSchoolGrade={student.schoolGrade}
          onboarding={onboarding}
        />
        {!onboarding && (
          <ParentRewardGoalsSection
            studentXp={student.xp}
            streakDays={student.streakDays}
            dailyGoalMinutes={student.dailyGoalMinutes}
            targetAheadMonths={student.targetAheadMonths}
            activeGoals={activeGoals}
          />
        )}
      </main>
    </div>
  );
}
