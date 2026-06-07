import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAdminSession } from "@/lib/auth/admin";

/** Admin pages need the DB at request time — skip static prerender during `next build`. */
export const dynamic = "force-dynamic";

function requestPathname(h: Headers): string {
  return (
    h.get("x-pathname") ??
    h.get("x-invoke-path") ??
    h.get("next-url")?.replace(/^https?:\/\/[^/]+/, "") ??
    ""
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = requestPathname(h);

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return children;
  }

  const session = await resolveAdminSession();
  if (!session) {
    const returnTo =
      pathname && !pathname.startsWith("/admin/login")
        ? pathname
        : "/admin/pdf-imports";
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  return children;
}
