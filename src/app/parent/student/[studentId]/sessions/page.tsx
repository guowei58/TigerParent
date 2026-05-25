import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPercent, formatMinutes } from "@/lib/utils";
import { getSessionContentMix } from "@/lib/content-provenance/benchmark";
import { confidenceLabel } from "@/lib/content-provenance/confidence";
import type { ConfidenceLevel } from "@/generated/prisma/client";

const SESSION_PURPOSE: Record<string, string> = {
  DAILY_MISSION: "Daily mission — mixed review, practice, and challenge",
  PRACTICE: "Targeted skill practice",
  DIAGNOSTIC: "Readiness check using high-confidence items",
  MASTERY_CHALLENGE: "Mastery challenge — high-confidence benchmark items",
};

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const { studentId } = await params;
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student) notFound();

  const sessions = await prisma.practiceSession.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    take: 30,
  });

  const sessionsWithMix = await Promise.all(
    sessions.map(async (s) => {
      const mix = await getSessionContentMix(s.id);
      const standards = await prisma.attempt.findMany({
        where: { sessionId: s.id },
        distinct: ["problemId"],
        select: {
          problem: {
            select: {
              standardAlignments: {
                select: { standard: { select: { standardCode: true } } },
              },
            },
          },
        },
        take: 50,
      });
      const standardCodes = [
        ...new Set(
          standards.flatMap((row) =>
            row.problem.standardAlignments.map((a) => a.standard.standardCode),
          ),
        ),
      ];
      const avgConfidenceLevel =
        mix.averageConfidence >= 75
          ? "HIGH"
          : mix.averageConfidence >= 50
            ? "MEDIUM"
            : mix.averageConfidence >= 25
              ? "LOW"
              : "NEEDS_REVIEW";
      return { session: s, mix, standardCodes, avgConfidenceLevel };
    }),
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardTitle>Sessions — {student.displayName}</CardTitle>
          <div className="mt-4 space-y-3">
            {sessionsWithMix.map(({ session: s, mix, standardCodes, avgConfidenceLevel }) => (
              <div
                key={s.id}
                className="rounded-xl bg-slate-50 p-4 text-sm space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.startedAt.toLocaleString()}</p>
                    <p className="text-slate-500">
                      {s.sessionType} · {s.totalProblems} problems
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>{formatMinutes(s.activeSeconds)}</span>
                    {s.accuracy != null && <span>{formatPercent(s.accuracy)}</span>}
                    <Badge variant={s.completed ? "success" : "default"}>
                      {s.completed ? "Done" : "Partial"}
                    </Badge>
                  </div>
                </div>
                {mix.count > 0 && (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      Content mix: {mix.officialPercent}% official · {mix.licensedPercent}%
                      licensed/OER · {mix.generatedPercent}% generated · avg confidence{" "}
                      {mix.averageConfidence} ({confidenceLabel(avgConfidenceLevel as ConfidenceLevel)})
                    </p>
                    {standardCodes.length > 0 && (
                      <p>Standards covered: {standardCodes.slice(0, 8).join(", ")}</p>
                    )}
                    <p className="text-slate-500">
                      Purpose: {SESSION_PURPOSE[s.sessionType] ?? "Practice session"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
