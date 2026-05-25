/** Stable dev fallback so JWT cookies survive server restarts locally. */
const DEV_AUTH_SECRET =
  "tigerparent-local-dev-auth-secret-v1-do-not-use-in-prod";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret && secret.trim().length >= 16) return secret.trim();
  if (process.env.NODE_ENV === "development") return DEV_AUTH_SECRET;
  throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) must be set in production.");
}
