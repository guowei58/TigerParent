import type { AppUserRole } from "@/auth.config";

/** Where to send a user after sign-in (parent portal is not used). */
export function portalPath(role: AppUserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STUDENT":
      return "/student";
    default:
      return "/login?notice=parent-portal-removed";
  }
}

export function isDeprecatedParentPortalPath(path: string): boolean {
  return path === "/parent" || path.startsWith("/parent/");
}
