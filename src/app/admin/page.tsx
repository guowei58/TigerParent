import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/layouts/AdminNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatBox } from "@/components/ui/Badge";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const [subjects, skills, problems, students, videos] = await Promise.all([
    prisma.subject.count(),
    prisma.skill.count(),
    prisma.problem.count(),
    prisma.studentProfile.count(),
    prisma.videoResource.count(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBox label="Subjects" value={subjects} accent="indigo" />
          <StatBox label="Skills" value={skills} accent="emerald" />
          <StatBox label="Problems" value={problems} accent="amber" />
          <StatBox label="Students" value={students} accent="rose" />
          <StatBox label="Videos" value={videos} accent="indigo" />
        </div>
        <Card>
          <CardTitle>Curriculum Management</CardTitle>
          <p className="text-slate-500 mt-2 text-sm">
            Add subjects, levels, skills, problems, and video resources. The modular
            structure supports K–12 expansion without code changes.
          </p>
        </Card>
      </main>
    </div>
  );
}
