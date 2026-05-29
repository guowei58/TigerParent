import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { WorkQueue } from "@/components/student/WorkQueue";
import { getStudentWorkQueue } from "@/lib/assignments/daily-planner";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { readinessBandLabel, recomputeSchoolReadiness } from "@/lib/readiness/school-readiness";
import { getOpenMistakes } from "@/lib/mistake-log";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  const studentId = session.user.studentProfileId;
  const { items, subjectId } = await getStudentWorkQueue(studentId);
  const mistakes = await getOpenMistakes(studentId, 5);

  let readiness = null;
  if (subjectId) {
    readiness = await recomputeSchoolReadiness(studentId, subjectId).catch(() => null);
  }

  return (
    <div className="min-h-[100dvh] pb-8">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Today&apos;s Work</h1>
          <p className="text-slate-600 mt-1">
            Warm-up → homework → quiz → fix mistakes. Instruction is secondary — practice first.
          </p>
        </div>

        {readiness && (
          <Card className="border-indigo-200 bg-indigo-50/40">
            <CardTitle>School Readiness</CardTitle>
            <p className="text-lg font-semibold text-indigo-900 mt-2">
              {readinessBandLabel(readiness.confidenceBand)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Benchmark performance: {Math.round(readiness.benchmarkPerformance)}% · Source-backed coverage:{" "}
              {Math.round(readiness.sourceBackedCoverageScore)}%
            </p>
          </Card>
        )}

        <WorkQueue
          title="Required today"
          subtitle="Complete each block in order for your daily practice plan."
          assignments={items.map((i) => i.assignment)}
        />

        {mistakes.length > 0 && (
          <Card>
            <CardTitle>Mistakes to fix</CardTitle>
            <ul className="mt-3 space-y-2">
              {mistakes.map((m) => (
                <li key={m.id} className="text-sm text-slate-700 flex items-center gap-2">
                  <Badge variant="warning">{m.mistakeType}</Badge>
                  <span className="truncate">{m.problem.prompt.slice(0, 80)}…</span>
                </li>
              ))}
            </ul>
            <Link href="/student/review-mistakes" className="text-indigo-600 text-sm font-medium mt-3 inline-block">
              Open mistake log →
            </Link>
          </Card>
        )}

        <p className="text-xs text-slate-400">
          Need a concept refresher?{" "}
          <Link href="/student/concepts" className="text-indigo-600 underline">
            Practice by Topics
          </Link>{" "}
          are available but optional.
        </p>
      </main>
    </div>
  );
}
