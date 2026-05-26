import { AdminNav } from "@/components/layouts/AdminNav";
import Link from "next/link";

export default function AdminQuestionBankPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Question Bank</h1>
        <p className="text-slate-600">Browse and filter all problems by source, grade, skill, and usage type.</p>
        <Link href="/admin/problems" className="text-indigo-600 font-medium">
          Open problem manager →
        </Link>
      </main>
    </div>
  );
}
