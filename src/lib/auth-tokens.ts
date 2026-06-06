import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import type { AuthTokenType } from "@/generated/prisma/client";
import { appUrl, sendAuthEmail } from "./email";

const TOKEN_HOURS: Record<AuthTokenType, number> = {
  EMAIL_VERIFY: 48,
  PASSWORD_RESET: 2,
  MAGIC_LINK: 1,
  STUDENT_INVITE: 72,
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createRawToken() {
  return randomBytes(32).toString("hex");
}

export async function createAuthToken(email: string, type: AuthTokenType) {
  const normalized = normalizeEmail(email);
  const token = createRawToken();
  const hours = TOKEN_HOURS[type];
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.authToken.deleteMany({
    where: { email: normalized, type, usedAt: null },
  });

  await prisma.authToken.create({
    data: { email: normalized, type, token, expiresAt },
  });

  return { token, expiresAt };
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findUnique({ where: { token } });
  if (!record || record.type !== type) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.email;
}

export async function sendVerificationEmail(email: string, name: string) {
  const { token } = await createAuthToken(email, "EMAIL_VERIFY");
  const url = appUrl(`/auth/verify?token=${token}&type=email-verify`);

  const result = await sendAuthEmail({
    to: email,
    subject: "Verify your TigerParent email",
    title: `Welcome, ${name}!`,
    body: "Confirm your email address to activate your student account.",
    actionLabel: "Verify email",
    actionUrl: url,
  });

  return {
    url,
    sent: result.ok,
    devMode: result.devMode ?? !result.ok,
    error: result.error,
  };
}

export async function sendMagicLinkEmail(email: string, name: string) {
  const { token } = await createAuthToken(email, "MAGIC_LINK");
  const url = appUrl(`/auth/verify?token=${token}&type=magic-link`);

  const result = await sendAuthEmail({
    to: email,
    subject: "Your TigerParent sign-in link",
    title: `Hi ${name}`,
    body: "Use this secure link to sign in. It expires in 1 hour.",
    actionLabel: "Sign in",
    actionUrl: url,
  });

  return {
    url,
    sent: result.ok,
    devMode: result.devMode ?? !result.ok,
    error: result.error,
  };
}

export async function sendPasswordResetEmail(email: string, name: string) {
  const { token } = await createAuthToken(email, "PASSWORD_RESET");
  const url = appUrl(`/reset-password?token=${token}`);

  await sendAuthEmail({
    to: email,
    subject: "Reset your TigerParent password",
    title: "Password reset",
    body: `Hi ${name}, we received a request to reset your password.`,
    actionLabel: "Reset password",
    actionUrl: url,
  });
}

export async function sendStudentInviteEmail(email: string, displayName: string) {
  const { token } = await createAuthToken(email, "STUDENT_INVITE");
  const url = appUrl(`/reset-password?token=${token}&welcome=1`);

  await sendAuthEmail({
    to: email,
    subject: "Your TigerParent student account is ready",
    title: `Welcome, ${displayName}!`,
    body: "Set your password to start learning on TigerParent.",
    actionLabel: "Set my password",
    actionUrl: url,
  });
}

export { normalizeEmail };
