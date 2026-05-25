import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { AdminLevelForm } from "./AdminLevelForm";

export default async function AdminLevelsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const { subjectId } = await params;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) notFound();

  const levels = await prisma.level.findMany({
    where: { subjectId },
    orderBy: { sequence: "asc" },
  });

  const track = await prisma.curriculumTrack.findFirst({ where: { subjectId } });

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Levels — {subject.name}</h1>
        {levels.map((l) => (
          <Card key={l.id}>
            <CardTitle>Grade {l.nominalGradeLevel}: {l.title}</CardTitle>
            <p className="text-sm text-slate-500">{l.description}</p>
          </Card>
        ))}
        {track && <AdminLevelForm subjectId={subjectId} trackId={track.id} />}
      </main>
    </div>
  );
}
