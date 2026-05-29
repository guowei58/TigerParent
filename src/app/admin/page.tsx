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
          <CardTitle>PDF Practice (primary)</CardTitle>
          <p className="text-slate-500 mt-2 text-sm">
            Upload practice PDFs, review parsed problems and crops, then approve for students.
            Students use PDF practice by default; set PDF_PRACTICE_ONLY=true in .env to hide the legacy question bank.
          </p>
          <a
            href="/admin/pdf-imports"
            className="inline-block mt-3 text-indigo-600 font-medium text-sm"
          >
            Go to PDF imports →
          </a>
        </Card>
        <Card>
          <CardTitle>Curriculum Management</CardTitle>
          <p className="text-slate-500 mt-2 text-sm">
            Legacy question bank (hidden from students while PDF-only mode is on).
          </p>
        </Card>
      </main>
    </div>
  );
}
