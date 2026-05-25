import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

export default async function AdminCurriculumPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const subjects = await prisma.subject.findMany({
    include: { tracks: true, _count: { select: { skills: true } } },
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Curriculum Tracks</h1>
        {subjects.map((s) => (
          <Card key={s.id}>
            <CardTitle>{s.name}</CardTitle>
            <p className="text-sm text-slate-500">{s._count.skills} skills total</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/admin/curriculum/${s.id}`} className="text-indigo-600 text-sm hover:underline">View →</Link>
              <Link href={`/admin/curriculum/${s.id}/levels`} className="text-indigo-600 text-sm hover:underline">Levels →</Link>
              <Link href={`/admin/curriculum/${s.id}/skills`} className="text-indigo-600 text-sm hover:underline">Skills →</Link>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
