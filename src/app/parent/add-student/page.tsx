import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ParentNav } from "@/components/layouts/ParentNav";
import { AddStudentForm } from "./AddStudentForm";

export default async function AddStudentPage() {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-lg px-4 py-6">
        <AddStudentForm familyId={session.user.familyId ?? "demo-family"} />
      </main>
    </div>
  );
}
