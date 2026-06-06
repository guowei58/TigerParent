import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

/**
 * Only protect /admin at the edge. Student routes auth in Node (student/layout.tsx)
 * because edge JWT decryption often fails in local dev — see auth.config.ts.
 */
export const config = {
  matcher: ["/admin/:path*"],
};
