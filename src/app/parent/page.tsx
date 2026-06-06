import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFamilyStudents, getWeeklyReport } from "@/lib/analytics";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, StatBox } from "@/components/ui/Badge";
import Link from "next/link";
import { gradeLabel, formatPercent } from "@/lib/utils";
import { prisma } from "@/lib/db";

export default async function ParentDashboardPage() {
  const session = await auth();
  if (!session?.user?.familyId && session?.user.role !== "ADMIN") redirect("/login");
  if (session.user.role !== "PARENT" && session.user.role !== "ADMIN") redirect("/login");

  const familyId = session.user.familyId ?? "demo-family";
  const students = await getFamilyStudents(familyId);

  const studentSummaries = await Promise.all(
    students.map(async (s) => {
      const report = await getWeeklyReport(s.id);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySession = await prisma.practiceSession.findFirst({
        where: {
          studentId: s.id,
          sessionType: "DAILY_MISSION",
          startedAt: { gte: todayStart },
        },
      });
      return { student: s, report, todayCompleted: todaySession?.completed ?? false };
    }),
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Family Dashboard</h1>
            <p className="text-slate-500">Monitor progress across all students</p>
          </div>
          <Link
            href="/parent/add-student"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
          >
            + Add Student
          </Link>
        </div>

        {studentSummaries.map(({ student, report, todayCompleted }) => (
          <Card key={student.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{student.displayName}</CardTitle>
                <p className="text-slate-500">{gradeLabel(student.schoolGrade)}</p>
              </div>
              <Badge variant={todayCompleted ? "success" : "warning"}>
                {todayCompleted ? "Today: Done ✓" : "Today: Not yet"}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Weekly Min" value={Math.round(report.totalMinutes)} accent="indigo" />
              <StatBox label="Accuracy" value={formatPercent(report.accuracy)} accent="emerald" />
              <StatBox label="Streak" value={`${student.streakDays}d`} accent="amber" />
              <StatBox label="Sessions" value={report.sessionsCompleted} accent="rose" />
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {student.placements.map((p) => (
                <div key={p.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="font-semibold">{p.subject.name}</span>
                  <span className="text-slate-500"> — Grade {p.assessedGradeLevel} working level</span>
                  <span className={`ml-2 ${p.monthsAheadOrBehind >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ({p.monthsAheadOrBehind >= 0 ? "+" : ""}{p.monthsAheadOrBehind} mo)
                  </span>
                </div>
              ))}
            </div>

            <Link
              href={`/parent/student/${student.id}`}
              className="mt-4 inline-block text-indigo-600 font-medium text-sm hover:underline"
            >
              View full profile →
            </Link>
          </Card>
        ))}
      </main>
    </div>
  );
}
