import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import { formatPercent } from "@/lib/utils";

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const { studentId } = await params;
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student) notFound();

  const mastery = await prisma.masteryState.findMany({
    where: { studentId },
    include: { skill: { include: { subject: true } } },
    orderBy: { lastPracticedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardTitle>Skill Mastery — {student.displayName}</CardTitle>
          <div className="mt-4 space-y-3">
            {mastery.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{m.skill.title}</p>
                    <p className="text-sm text-slate-500">{m.skill.subject.name}</p>
                  </div>
                  <Badge variant={m.status === "MASTERED" ? "success" : m.status === "REGRESSED" ? "warning" : "info"}>
                    {m.status}
                  </Badge>
                </div>
                <div className="mt-2">
                  <ProgressBar value={m.masteryScore} />
                  <p className="text-xs text-slate-400 mt-1">
                    Score {m.masteryScore} · {formatPercent(m.accuracy)} accuracy · {m.attemptsCount} attempts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
