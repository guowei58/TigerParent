import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { confidenceLabel } from "@/lib/content-provenance/confidence";

export default async function ProblemProvenancePage({
  searchParams,
}: {
  searchParams: Promise<{ problemId?: string }>;
}) {
  const { problemId } = await searchParams;
  const problems = problemId
    ? await prisma.problem.findMany({
        where: { id: problemId },
        include: { contentSource: true, standardAlignments: { include: { standard: true } } },
      })
    : await prisma.problem.findMany({
        where: { provenanceStatus: { in: ["UNKNOWN", "NEEDS_REVIEW"] } },
        include: { contentSource: true, standardAlignments: { include: { standard: true } } },
        take: 30,
        orderBy: { updatedAt: "desc" },
      });

  return (
    <div>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Problem Provenance</h1>
        {problems.map((problem) => (
          <Card key={problem.id}>
            <CardTitle className="text-base">{problem.id}</CardTitle>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Content class</dt><dd>{problem.contentClass}</dd></div>
              <div><dt className="text-slate-500">Copyright</dt><dd>{problem.copyrightStatus}</dd></div>
              <div><dt className="text-slate-500">Provenance</dt><dd>{problem.provenanceStatus}</dd></div>
              <div><dt className="text-slate-500">Confidence</dt><dd>{confidenceLabel(problem.confidenceLevel)} ({problem.confidenceScore})</dd></div>
              <div><dt className="text-slate-500">Source</dt><dd>{problem.contentSource?.name ?? problem.sourceName ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Usage</dt><dd>{problem.usageType}</dd></div>
              <div><dt className="text-slate-500">Exam</dt><dd>{problem.sourceExam ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Standard</dt><dd>{problem.sourceStandardCode ?? (problem.standardAlignments.map(a => a.standard.standardCode).join(", ") || "—")}</dd></div>
            </dl>
            {problem.attributionText && (
              <p className="text-xs mt-3 bg-slate-50 rounded-lg p-3">{problem.attributionText}</p>
            )}
          </Card>
        ))}
      </main>
    </div>
  );
}
