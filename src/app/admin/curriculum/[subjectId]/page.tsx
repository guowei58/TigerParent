import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

export default async function AdminSubjectCurriculumPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const { subjectId } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      levels: { orderBy: { sequence: "asc" }, include: { _count: { select: { skills: true } } } },
    },
  });
  if (!subject) notFound();

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">{subject.name} Curriculum</h1>
        {subject.levels.map((l) => (
          <Card key={l.id}>
            <CardTitle>Grade {l.nominalGradeLevel}: {l.title}</CardTitle>
            <p className="text-sm text-slate-500">{l._count.skills} skills</p>
          </Card>
        ))}
        <div className="flex gap-3">
          <Link href={`/admin/curriculum/${subjectId}/levels`} className="text-indigo-600 hover:underline">Manage Levels</Link>
          <Link href={`/admin/curriculum/${subjectId}/skills`} className="text-indigo-600 hover:underline">Manage Skills</Link>
        </div>
      </main>
    </div>
  );
}
