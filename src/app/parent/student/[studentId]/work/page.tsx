import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { WorkQualityBadge, resolveAttemptWorkQuality } from "@/components/WorkQualityBadge";

export default async function WorkReviewListPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const { studentId } = await params;
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { studentId },
    include: {
      problem: { include: { skill: true } },
      strokes: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardTitle>Work Review — {student.displayName}</CardTitle>
          <div className="mt-4 space-y-2">
            {attempts.map((a) => {
              const quality = resolveAttemptWorkQuality(a);
              return (
              <Link
                key={a.id}
                href={`/parent/student/${studentId}/work/${a.id}`}
                className="block rounded-xl bg-slate-50 p-3 hover:bg-slate-100"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-sm">{a.problem.skill.title}</p>
                  <span className={a.isCorrect ? "text-emerald-600" : "text-rose-600"}>
                    {a.isCorrect ? "✓" : "✗"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">{a.problem.prompt}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-xs text-slate-400">
                    {a.createdAt.toLocaleString()}
                  </p>
                  <WorkQualityBadge
                    quality={quality}
                    requiresScratchpad={a.problem.requiresScratchpad}
                  />
                </div>
              </Link>
            );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
}
