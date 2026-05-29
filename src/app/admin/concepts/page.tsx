import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";

export default async function AdminConceptsPage() {
  const session = await auth();
  if (!isAdminSession(session)) redirect("/admin/login");

  const concepts = await prisma.practiceConcept.findMany({
    orderBy: [{ gradeLevel: "asc" }, { domain: "asc" }, { sortOrder: "asc" }],
  });

  const counts = await prisma.pdfPracticeProblem.groupBy({
    by: ["primaryConceptId"],
    where: { approvedForStudentUse: true },
    _count: { id: true },
  });
  const map = new Map(counts.map((c) => [c.primaryConceptId, c._count.id]));

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Practice concepts</h1>
        <div className="bg-white rounded-2xl border divide-y">
          {concepts.map((c) => (
            <div key={c.id} className="p-3 flex justify-between text-sm">
              <span>
                G{c.gradeLevel} · {c.domain} · {c.name}
              </span>
              <span className="text-slate-500">{map.get(c.id) ?? 0} approved</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
