import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { PlacementForm } from "./PlacementForm";

export default async function PlacementPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const { studentId } = await params;
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      placements: { include: { subject: true, currentLevel: true, currentSkill: true } },
      settings: true,
    },
  });
  if (!student) notFound();

  const subjects = await prisma.subject.findMany();
  const levels = await prisma.level.findMany({
    include: { skills: { orderBy: { sequence: "asc" } } },
    orderBy: [{ subjectId: "asc" }, { sequence: "asc" }],
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Card>
          <CardTitle>Placement & Settings — {student.displayName}</CardTitle>
          <PlacementForm student={student} subjects={subjects} levels={levels} />
        </Card>
      </main>
    </div>
  );
}
