import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";

export default async function AdminSourcesPage() {
  const sources = await prisma.contentSource.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { problems: true, imports: true } } },
  });

  return (
    <div>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Content Sources</h1>
          <Link href="/admin/import-content" className="text-indigo-600 font-medium">
            Import content →
          </Link>
        </div>
        <p className="text-slate-600 text-sm">
          Register official, licensed, OER, or generated sources before importing or approving
          student-facing content. No scraping — manual import with documented rights only.
        </p>
        {sources.map((source) => (
          <Card key={source.id}>
            <CardTitle>{source.name}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {source.sourceType} · {source.publisher ?? "Unknown publisher"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {source._count.problems} problems · {source._count.imports} import batches
            </p>
            {source.allowedUseNotes && (
              <p className="text-sm mt-2 bg-slate-50 rounded-lg p-3">{source.allowedUseNotes}</p>
            )}
            {source.url && (
              <a href={source.url} className="text-sm text-indigo-600 mt-2 inline-block" target="_blank" rel="noreferrer">
                Source URL
              </a>
            )}
          </Card>
        ))}
      </main>
    </div>
  );
}
