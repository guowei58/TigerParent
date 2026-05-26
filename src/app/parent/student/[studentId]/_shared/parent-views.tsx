import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AssignmentType } from "@/generated/prisma/client";
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_TYPE_LABELS } from "@/lib/assignments/types";
import { getMistakeStats } from "@/lib/mistake-log";
import { readinessBandLabel, recomputeSchoolReadiness } from "@/lib/readiness/school-readiness";
import { getSatFoundationProgress } from "@/lib/sat-readiness";
import { getSessionContentMix } from "@/lib/content-provenance/benchmark";

async function verifyParentAccess(studentId: string, userId: string, role: string) {
  const student = await prisma.studentProfile.findFirst({
    where: role === "ADMIN" ? { id: studentId } : { id: studentId, family: { users: { some: { id: userId } } } },
    select: { id: true, displayName: true, schoolGrade: true },
  });
  return student;
}

export function createParentAssignmentPage(types: AssignmentType[], title: string) {
  return async function ParentAssignmentPage({
    params,
  }: {
    params: Promise<{ studentId: string }>;
  }) {
    const session = await auth();
    if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "ADMIN")) {
      redirect("/login");
    }

    const { studentId } = await params;
    const student = await verifyParentAccess(studentId, session.user.id, session.user.role);
    if (!student) notFound();

    const assignments = await prisma.assignment.findMany({
      where: { studentId, assignmentType: { in: types } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        <ParentNav />
        <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <Link href={`/parent/student/${studentId}`} className="text-indigo-600 text-sm hover:underline">
            ← {student.displayName}
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="space-y-3">
            {assignments.map((a) => {
              const mix = a.sourceMixJson as { officialPercent?: number; generatedPercent?: number } | null;
              return (
                <Card key={a.id}>
                  <div className="flex flex-wrap gap-2 items-center">
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                    <Badge>{ASSIGNMENT_STATUS_LABELS[a.status]}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {ASSIGNMENT_TYPE_LABELS[a.assignmentType]} · {a.completedAt?.toLocaleDateString() ?? "In progress"}
                  </p>
                  {mix && (
                    <p className="text-xs text-slate-400 mt-1">
                      Source mix: {mix.officialPercent ?? 0}% official · {mix.generatedPercent ?? 0}% generated
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  };
}

export async function ParentMistakesPage({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "ADMIN")) redirect("/login");
  const { studentId } = await params;
  const student = await verifyParentAccess(studentId, session.user.id, session.user.role);
  if (!student) notFound();
  const stats = await getMistakeStats(studentId);
  const mistakes = await prisma.mistakeLog.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { problem: { select: { prompt: true } } },
  });

  return (
    <ParentShell student={student} studentId={studentId} title="Mistake Patterns">
      <Card>
        <CardTitle>Summary</CardTitle>
        <p className="text-sm text-slate-600 mt-2">{stats.open} need retake · {stats.total} logged (30 days)</p>
      </Card>
      {mistakes.map((m) => (
        <Card key={m.id}>
          <Badge variant="warning">{m.mistakeType}</Badge>
          <p className="text-sm mt-2">{m.problem.prompt.slice(0, 160)}…</p>
          <p className="text-xs text-slate-500 mt-1">Student: {m.studentAnswer} · Correct: {m.correctAnswer}</p>
        </Card>
      ))}
    </ParentShell>
  );
}

export async function ParentSchoolReadinessPage({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "ADMIN")) redirect("/login");
  const { studentId } = await params;
  const student = await verifyParentAccess(studentId, session.user.id, session.user.role);
  if (!student) notFound();

  const subjects = await prisma.subject.findMany();
  const scores = await Promise.all(
    subjects.map((s) => recomputeSchoolReadiness(studentId, s.id).catch(() => null)),
  );

  return (
    <ParentShell student={student} studentId={studentId} title="School Readiness">
      <p className="text-sm text-slate-600">
        Readiness bands describe school-test readiness trends — not guaranteed grades.
      </p>
      {scores.filter(Boolean).map((score) => (
        <Card key={score!.id}>
          <CardTitle>{subjects.find((s) => s.id === score!.subjectId)?.name ?? "Subject"}</CardTitle>
          <p className="text-lg font-semibold text-indigo-900 mt-2">
            {readinessBandLabel(score!.confidenceBand)}
          </p>
          <ul className="text-sm text-slate-600 mt-2 space-y-1">
            <li>Homework: {Math.round(score!.homeworkPerformance)}%</li>
            <li>Quizzes: {Math.round(score!.quizPerformance)}%</li>
            <li>Benchmarks: {Math.round(score!.benchmarkPerformance)}%</li>
            <li>Source-backed coverage: {Math.round(score!.sourceBackedCoverageScore)}%</li>
          </ul>
        </Card>
      ))}
    </ParentShell>
  );
}

export async function ParentSatFoundationPage({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "ADMIN")) redirect("/login");
  const { studentId } = await params;
  const student = await verifyParentAccess(studentId, session.user.id, session.user.role);
  if (!student) notFound();
  const progress = await getSatFoundationProgress(studentId);

  return (
    <ParentShell student={student} studentId={studentId} title="SAT Foundation">
      <Card>
        <CardTitle>{progress.confidenceLabel}</CardTitle>
        <p className="text-sm text-slate-600 mt-2">{progress.overallFoundationPercent}% foundation skills ready</p>
        <p className="text-xs text-slate-400 mt-2">{progress.disclaimer}</p>
      </Card>
    </ParentShell>
  );
}

export async function ParentSourceMixPage({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "PARENT" && session.user.role !== "ADMIN")) redirect("/login");
  const { studentId } = await params;
  const student = await verifyParentAccess(studentId, session.user.id, session.user.role);
  if (!student) notFound();

  const sessions = await prisma.practiceSession.findMany({
    where: { studentId, completed: true },
    orderBy: { endedAt: "desc" },
    take: 15,
  });

  const mixes = await Promise.all(
    sessions.map(async (s) => ({
      session: s,
      mix: await getSessionContentMix(s.id),
    })),
  );

  return (
    <ParentShell student={student} studentId={studentId} title="Source Mix">
      <p className="text-sm text-slate-600">
        Shows what fraction of practice came from official, licensed, and generated content.
      </p>
      {mixes.map(({ session, mix }) => (
        <Card key={session.id}>
          <p className="font-medium">{session.sessionType}</p>
          <p className="text-sm text-slate-500">{session.startedAt.toLocaleDateString()}</p>
          <p className="text-sm mt-2">
            Official {mix.officialPercent}% · Licensed/OER {mix.licensedPercent}% · Generated {mix.generatedPercent}%
          </p>
        </Card>
      ))}
    </ParentShell>
  );
}

function ParentShell({
  student,
  studentId,
  title,
  children,
}: {
  student: { displayName: string };
  studentId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Link href={`/parent/student/${studentId}`} className="text-indigo-600 text-sm hover:underline">
          ← {student.displayName}
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
