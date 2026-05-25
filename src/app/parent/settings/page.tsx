import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ParentNav } from "@/components/layouts/ParentNav";
import { Card, CardTitle } from "@/components/ui/Card";

export default async function ParentSettingsPage() {
  const session = await auth();
  if (session?.user.role !== "PARENT" && session?.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ParentNav />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Card>
          <CardTitle>Account Settings</CardTitle>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>Name:</strong> {session.user.name}</p>
            <p className="text-slate-400 mt-4">
              Video approval, difficulty, and per-student settings are managed on each student&apos;s placement page.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
