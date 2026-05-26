import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";

export default function AdminBenchmarkBankPage() {
  const official = SOURCE_REGISTRY.filter((s) => s.importStatus === "FULL_IMPORT_ALLOWED");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Benchmark Bank</h1>
        <p className="text-slate-600">
          Official and licensed sources approved for benchmarks, diagnostics, and mastery certification.
        </p>
        {official.map((s) => (
          <Card key={s.id}>
            <CardTitle>{s.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{s.importStatus} · {s.jurisdiction ?? "National"}</p>
            {s.url && (
              <a href={s.url} className="text-indigo-600 text-sm mt-2 inline-block" target="_blank" rel="noreferrer">
                Source URL →
              </a>
            )}
          </Card>
        ))}
      </main>
    </div>
  );
}
