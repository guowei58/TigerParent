import type { Session } from "next-auth";

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminSession(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  const allow = getAdminEmails();
  if (allow.size === 0) return false;
  return allow.has(session.user.email.toLowerCase());
}
