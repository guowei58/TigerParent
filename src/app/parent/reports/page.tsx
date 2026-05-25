import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFamilyStudents, getWeeklyReport } from "@/lib/analytics";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatPercent } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const familyId = session.user.familyId ?? "demo-family";
  const students = await getFamilyStudents(familyId);

  const reports = await Promise.all(
    students.map(async (s) => ({
      student: s,
      report: await getWeeklyReport(s.id),
    })),
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Weekly Reports</h1>
        {reports.map(({ student, report }) => (
          <Card key={student.id}>
            <CardTitle>{student.displayName}</CardTitle>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-slate-500">Minutes</p><p className="text-xl font-bold">{Math.round(report.totalMinutes)}</p></div>
              <div><p className="text-slate-500">Accuracy</p><p className="text-xl font-bold">{formatPercent(report.accuracy)}</p></div>
              <div><p className="text-slate-500">Days Active</p><p className="text-xl font-bold">{report.daysActive}/7</p></div>
              <div><p className="text-slate-500">Consistency</p><p className="text-xl font-bold">{formatPercent(report.consistencyScore)}</p></div>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
