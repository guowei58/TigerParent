import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { AdminSkillForm } from "./AdminSkillForm";

export default async function AdminSkillsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const { subjectId } = await params;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) notFound();

  const skills = await prisma.skill.findMany({
    where: { subjectId },
    include: { level: true, _count: { select: { problems: true } } },
    orderBy: [{ nominalGradeLevel: "asc" }, { sequence: "asc" }],
  });

  const levels = await prisma.level.findMany({ where: { subjectId } });

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Skills — {subject.name}</h1>
        {skills.map((s) => (
          <Card key={s.id}>
            <CardTitle>{s.title}</CardTitle>
            <p className="text-sm text-slate-500">
              Grade {s.nominalGradeLevel} · {s.level.title} · {s._count.problems} problems
            </p>
          </Card>
        ))}
        <AdminSkillForm subjectId={subjectId} levels={levels} />
      </main>
    </div>
  );
}
