import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { AdminProblemForm } from "./AdminProblemForm";

export default async function AdminProblemsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const problems = await prisma.problem.findMany({
    include: { skill: { include: { subject: true } } },
    orderBy: { gradeLevel: "asc" },
    take: 50,
  });

  const skills = await prisma.skill.findMany({
    include: { subject: true },
    orderBy: { title: "asc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Problems</h1>
        <AdminProblemForm skills={skills} />
        {problems.map((p) => (
          <Card key={p.id}>
            <p className="text-xs text-indigo-600">{p.skill.subject.name} · {p.skill.title}</p>
            <CardTitle className="text-base mt-1">{p.prompt.slice(0, 120)}{p.prompt.length > 120 ? "…" : ""}</CardTitle>
            <p className="text-sm text-slate-500">Answer: {p.correctAnswer} · Grade {p.gradeLevel}</p>
          </Card>
        ))}
      </main>
    </div>
  );
}
