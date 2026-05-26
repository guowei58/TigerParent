import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";

const BUILDERS = [
  { title: "Quiz Builder", href: "/admin/homework-builder", desc: "10–20 problem timed quizzes" },
  { title: "Unit Test Builder", href: "/admin/homework-builder", desc: "30–50 problem multi-skill tests" },
  { title: "Benchmark Builder", href: "/admin/benchmark-bank", desc: "Official-source-only benchmarks" },
  { title: "Retake Builder", href: "/admin/homework-builder", desc: "Auto-build from mistake logs" },
];

export default function AdminTestBuilderPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Test Builder</h1>
        {BUILDERS.map((b) => (
          <Card key={b.title}>
            <CardTitle>{b.title}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">{b.desc}</p>
          </Card>
        ))}
      </main>
    </div>
  );
}
