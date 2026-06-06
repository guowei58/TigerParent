import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { getSatFoundationProgress } from "@/lib/sat-readiness";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Badge";
import Link from "next/link";

export default async function SatFoundationPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  const progress = await getSatFoundationProgress(session.user.studentProfileId);

  return (
    <div className="min-h-[100dvh] pb-8">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SAT Foundation</h1>
          <p className="text-slate-600 mt-1">
            Long-term readiness built through school skills — not daily SAT branding for younger grades.
          </p>
        </div>

        <Card>
          <CardTitle>Foundation progress</CardTitle>
          <p className="text-lg font-semibold text-indigo-900 mt-2">{progress.confidenceLabel}</p>
          <div className="mt-4">
            <ProgressBar value={progress.overallFoundationPercent} />
            <p className="text-sm text-slate-500 mt-1">
              {Math.round(progress.overallFoundationPercent)}% of mapped SAT foundation skills ready
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-3">{progress.disclaimer}</p>
        </Card>

        {progress.domains.length > 0 && (
          <Card>
            <CardTitle>Domain focus</CardTitle>
            <ul className="mt-3 space-y-2">
              {progress.domains.map((d) => (
                <li key={d.domain} className="flex justify-between text-sm">
                  <span>{d.domain}</span>
                  <span className="text-slate-500">
                    {d.masteredSkills}/{d.totalSkills} skills · {d.percentReady}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <p className="text-xs text-slate-400">
          Official SAT practice is tracked separately via linked College Board / Khan Academy resources in parent settings.
        </p>
        <Link href="/student/for-parents" className="text-indigo-600 text-sm font-medium">
          Review your kid&apos;s work →
        </Link>
      </main>
    </div>
  );
}
