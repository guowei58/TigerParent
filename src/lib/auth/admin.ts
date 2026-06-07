import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AppUserRole } from "@/auth.config";

const DEV_ADMIN_EMAIL = "admin@tigerparent.local";

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allow = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  if (process.env.NODE_ENV === "development") {
    allow.add(DEV_ADMIN_EMAIL);
  }
  return allow;
}

export function isAdminSession(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  const email = session.user.email?.toLowerCase();
  if (!email) return false;
  return getAdminEmails().has(email);
}

/** Resolve admin session in Node — re-checks DB if JWT role is missing or stale. */
export async function resolveAdminSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user) return null;

  if (isAdminSession(session)) return session;

  const user = session.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, email: true },
      })
    : session.user.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email.toLowerCase() },
          select: { role: true, email: true },
        })
      : null;
  if (!user) return null;

  session.user.email = user.email;
  if (user.role === "ADMIN") {
    session.user.role = "ADMIN";
    return session;
  }
  if (getAdminEmails().has(user.email.toLowerCase())) {
    session.user.role = user.role as AppUserRole;
    return session;
  }

  return null;
}

export async function requireAdminApiSession(): Promise<
  { session: Session; response: null } | { session: null; response: NextResponse }
> {
  const session = await resolveAdminSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, response: null };
}
