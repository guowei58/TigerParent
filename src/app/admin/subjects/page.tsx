import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

export default async function AdminSubjectsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const subjects = await prisma.subject.findMany({
    include: { _count: { select: { skills: true, levels: true } } },
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Subjects</h1>
        {subjects.map((s) => (
          <Link key={s.id} href={`/admin/curriculum/${s.id}`}>
            <Card className="hover:border-indigo-300 cursor-pointer">
              <CardTitle>{s.name}</CardTitle>
              <p className="text-slate-500 text-sm">{s._count.levels} levels · {s._count.skills} skills</p>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  );
}
