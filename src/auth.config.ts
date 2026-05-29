import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/auth-secret";

export type AppUserRole = "PARENT" | "STUDENT" | "TEACHER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AppUserRole;
      familyId?: string | null;
      studentProfileId?: string | null;
    };
  }

  interface User {
    role: AppUserRole;
    familyId?: string | null;
    studentProfileId?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: AppUserRole;
    familyId?: string | null;
    studentProfileId?: string | null;
  }
}

export default {
  trustHost: true,
  secret: getAuthSecret(),
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;

      if (path.startsWith("/api/auth")) return true;

      const publicPaths = [
        "/",
        "/login",
        "/admin/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/auth/verify",
      ];
      if (publicPaths.some((p) => path === p || path.startsWith(`${p}/`))) return true;

      // App API routes authenticate in Node route handlers. Edge middleware
      // can fail JWT decryption when env/workspace roots differ in dev.
      if (path.startsWith("/api/")) return true;

      if (!auth?.user) {
        const login = new URL("/login", request.nextUrl);
        login.searchParams.set("callbackUrl", path);
        return NextResponse.redirect(login);
      }

      const role = auth.user.role;

      if (path.startsWith("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
      }
      if (path.startsWith("/parent") && role !== "PARENT" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
      }
      if (path.startsWith("/student") && role !== "STUDENT" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.familyId = user.familyId;
        token.studentProfileId = user.studentProfileId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.familyId = token.familyId;
        session.user.studentProfileId = token.studentProfileId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
