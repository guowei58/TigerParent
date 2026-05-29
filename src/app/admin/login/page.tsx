import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";

export default async function AdminLoginPage() {
  const session = await auth();
  if (isAdminSession(session)) redirect("/admin/pdf-imports");

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
        <p className="text-slate-600 mt-2 text-sm">
          Sign in with an admin account. Set <code className="text-xs">ADMIN_EMAILS</code> in
          your environment to allow additional emails with the ADMIN role.
        </p>
        <Link
          href="/login?callbackUrl=/admin/pdf-imports"
          className="mt-6 block w-full text-center rounded-xl bg-indigo-600 text-white py-3 font-medium hover:bg-indigo-700"
        >
          Continue to sign in
        </Link>
      </div>
    </div>
  );
}
