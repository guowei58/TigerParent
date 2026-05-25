import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig, { type AppUserRole } from "@/auth.config";
import { isJwtSessionError } from "@/lib/auth-errors";
import { prisma } from "./db";

export type { AppUserRole };

const { callbacks: authCallbacks, ...authConfigRest } = authConfig;

async function resolveStudentProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

const nextAuth = NextAuth({
  ...authConfigRest,
  callbacks: {
    ...authCallbacks,
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.familyId = user.familyId;
        token.studentProfileId = user.studentProfileId;
      } else if (token.sub && token.role === "STUDENT" && !token.studentProfileId) {
        token.studentProfileId = await resolveStudentProfileId(token.sub);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.familyId = token.familyId;
        session.user.studentProfileId = token.studentProfileId ?? null;

        if (session.user.role === "STUDENT" && !session.user.studentProfileId && token.sub) {
          session.user.studentProfileId = await resolveStudentProfileId(token.sub);
        }
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: String(credentials.email).toLowerCase() },
            include: { studentProfile: true },
          });

          if (!user) return null;

          const valid = await bcrypt.compare(
            String(credentials.password),
            user.password,
          );
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as AppUserRole,
            familyId: user.familyId,
            studentProfileId: user.studentProfile?.id ?? null,
          };
        } catch (error) {
          console.error("[auth] Database error during login:", error);
          throw new Error("DatabaseConnection");
        }
      },
    }),
    ...(authConfig.providers ?? []),
  ],
});

export const { handlers, signIn, signOut, auth: internalAuth } = nextAuth;

/** Safe session read — stale/invalid cookies return null instead of crashing. */
export async function auth() {
  try {
    return await internalAuth();
  } catch (error) {
    if (isJwtSessionError(error)) {
      return null;
    }
    throw error;
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function requireStudentSession() {
  const session = await requireAuth();
  if (!session.user.studentProfileId) {
    throw new Error("Student profile required");
  }
  return session;
}

export async function requireRole(roles: AppUserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

export function portalPath(role: AppUserRole) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PARENT":
      return "/parent";
    case "STUDENT":
      return "/student";
    case "TEACHER":
      return "/parent";
    default:
      return "/login";
  }
}
