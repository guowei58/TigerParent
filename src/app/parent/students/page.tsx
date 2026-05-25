import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFamilyStudents } from "@/lib/analytics";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { gradeLabel } from "@/lib/utils";
import Link from "next/link";

export default async function ParentStudentsPage() {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  const familyId = session.user.familyId ?? "demo-family";
  const students = await getFamilyStudents(familyId);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Students</h1>
        {students.map((s) => (
          <Link key={s.id} href={`/parent/student/${s.id}`}>
            <Card className="hover:border-indigo-200 transition cursor-pointer">
              <CardTitle>{s.displayName}</CardTitle>
              <p className="text-slate-500">{gradeLabel(s.schoolGrade)} · {s.user.email}</p>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  );
}
