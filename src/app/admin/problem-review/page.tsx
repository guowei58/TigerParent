import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getProblemReviewQueue } from "@/lib/content-audit";
import { ProblemReviewActions } from "./ProblemReviewActions";
import { ProblemPromptDisplay } from "@/components/ProblemPromptDisplay";

export default async function ProblemReviewPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const queue = await getProblemReviewQueue(40);

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Problem Review Queue</h1>
        <p className="text-sm text-slate-600">
          Only approved, validated problems reach students. AI critique is advisory —
          math answers are checked deterministically when possible.
        </p>

        {queue.length === 0 ? (
          <Card>
            <CardTitle>Queue empty</CardTitle>
            <p className="text-slate-500 mt-2">No problems awaiting review.</p>
          </Card>
        ) : (
          queue.map((problem) => (
            <Card key={problem.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-indigo-600">
                    {problem.skill.subject.name} · {problem.skill.title}
                  </p>
                  <Badge variant="warning" className="mt-1">
                    {problem.reviewStatus}
                  </Badge>
                </div>
                <ProblemReviewActions problemId={problem.id} />
              </div>

              <ProblemPromptDisplay prompt={problem.prompt} compact />

              <dl className="grid md:grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">Answer</dt>
                  <dd className="font-medium">{problem.correctAnswer}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Grade / Difficulty / Time</dt>
                  <dd>
                    G{problem.gradeLevel} · D{problem.difficulty} ·{" "}
                    {problem.targetSeconds}s
                  </dd>
                </div>
              </dl>

              {problem.explanation && (
                <p className="text-sm bg-emerald-50 rounded-xl p-3 text-emerald-900">
                  {problem.explanation}
                </p>
              )}

              {Array.isArray(problem.solutionStepsJson) &&
                (problem.solutionStepsJson as unknown[]).length > 0 && (
                  <div className="text-sm">
                    <p className="font-semibold text-slate-700">Solution steps</p>
                    <ol className="list-decimal ml-5 mt-1 space-y-1 text-slate-600">
                      {(problem.solutionStepsJson as string[]).map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

              <div className="text-sm">
                <p className="font-semibold text-slate-700">Validation results</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {problem.validationRuns.map((run) => (
                    <Badge
                      key={run.id}
                      variant={
                        run.status === "PASS"
                          ? "success"
                          : run.status === "FAIL"
                            ? "warning"
                            : "info"
                      }
                    >
                      {run.validationType}: {run.status}
                    </Badge>
                  ))}
                </div>
              </div>

              {problem.standardAlignments.length > 0 && (
                <p className="text-xs text-slate-500">
                  Standards:{" "}
                  {problem.standardAlignments
                    .map((a) => a.standard.standardCode)
                    .join(", ")}
                </p>
              )}
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
