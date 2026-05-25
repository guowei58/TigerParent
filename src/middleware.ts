import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

/** Only protect app areas — skip `/` so stale cookies don't crash the landing page. */
export const config = {
  matcher: ["/student/:path*", "/parent/:path*", "/admin/:path*"],
};
