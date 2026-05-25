import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { confidenceLabel } from "@/lib/content-provenance/confidence";

export default async function ImportReviewPage() {
  const items = await prisma.problem.findMany({
    where: {
      reviewStatus: { in: ["NEEDS_REVIEW", "DRAFT"] },
      contentClass: { in: ["OFFICIAL_RELEASED", "LICENSED_OR_OER"] },
    },
    include: { skill: true, contentSource: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Import Review Queue</h1>
        <p className="text-sm text-slate-600">
          Imported and official items require admin approval before students can see them.
        </p>
        {items.map((problem) => (
          <Card key={problem.id}>
            <CardTitle className="text-base">{problem.skill.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {problem.contentClass} · {problem.contentSource?.name ?? problem.sourceName} ·{" "}
              {confidenceLabel(problem.confidenceLevel)}
            </p>
            <p className="text-sm mt-2 line-clamp-3">{problem.prompt}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={`/admin/problem-review`} className="text-indigo-600 font-medium">
                Open review queue
              </Link>
              <Link href={`/admin/problem-provenance?problemId=${problem.id}`} className="text-indigo-600">
                Provenance
              </Link>
            </div>
          </Card>
        ))}
        {!items.length && (
          <Card>
            <p className="text-slate-600 text-sm">No imported items awaiting review.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
