import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

export default function AdminHomeworkBuilderPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Homework Builder</h1>
        <Card>
          <CardTitle>Build homework sets</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Select skills, set problem count, and choose source strictness. Generated drills allowed in balanced mode.
          </p>
          <Link href="/admin/import-content" className="text-indigo-600 text-sm mt-3 inline-block">
            Import source-backed items →
          </Link>
        </Card>
      </main>
    </div>
  );
}
