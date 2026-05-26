import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getMistakeStats, getOpenMistakes } from "@/lib/mistake-log";
import Link from "next/link";

export default async function ReviewMistakesPage() {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  const [mistakes, stats] = await Promise.all([
    getOpenMistakes(session.user.studentProfileId),
    getMistakeStats(session.user.studentProfileId),
  ]);

  return (
    <div className="min-h-[100dvh] pb-8">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mistake Log</h1>
          <p className="text-slate-600 mt-1">
            Review errors, read short explanations, then retake missed skills.
          </p>
        </div>

        <Card>
          <CardTitle>Last 30 days</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            {stats.open} open · {stats.total} total mistakes logged
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <Badge key={type} variant="default">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </Card>

        <div className="space-y-3">
          {mistakes.map((m) => (
            <Card key={m.id}>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="warning">{m.mistakeType}</Badge>
                {m.assignment && <Badge>{m.assignment.title}</Badge>}
              </div>
              <p className="mt-2 text-slate-800">{m.problem.prompt}</p>
              <p className="text-sm text-rose-700 mt-2">Your answer: {m.studentAnswer}</p>
              <p className="text-sm text-emerald-700">Correct: {m.correctAnswer}</p>
              {m.explanation && (
                <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-xl p-3">{m.explanation}</p>
              )}
            </Card>
          ))}
        </div>

        {mistakes.length > 0 && (
          <Link href="/student/retake" className="text-indigo-600 font-medium">
            Start retake set →
          </Link>
        )}
      </main>
    </div>
  );
}
