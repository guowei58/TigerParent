import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentDashboard } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { StatBox } from "@/components/ui/Badge";
import { gradeLabel } from "@/lib/utils";
import { getSubjectLearningCards } from "@/lib/unit-learning";
import { getRecentPracticeSummariesForStudent } from "@/lib/recent-practice-summaries";
import { RecentPracticeSection } from "@/components/student/RecentPracticeSection";
import { SubjectLearningCard } from "@/components/student/SubjectLearningCard";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const studentId = session.user.studentProfileId;
  const [data, subjectCards, recentPractices] = await Promise.all([
    getStudentDashboard(studentId),
    getSubjectLearningCards(studentId),
    getRecentPracticeSummariesForStudent(studentId, 12),
  ]);

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

        <div className="grid md:grid-cols-2 gap-6">
          {subjectCards.map((card) => (
            <SubjectLearningCard key={card.subjectId} card={card} />
          ))}
        </div>

        <RecentPracticeSection practices={recentPractices} />
      </main>
    </div>
  );
}
