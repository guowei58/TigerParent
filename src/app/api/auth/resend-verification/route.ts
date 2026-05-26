import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, sendVerificationEmail } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, we sent a new verification link.",
    });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "This email is already verified. Try signing in." }, { status: 400 });
  }

  try {
    const { url, sent, devMode, error } = await sendVerificationEmail(email, user.name);

    if (!sent) {
      return NextResponse.json({
        ok: true,
        message: error ?? "Could not email the verification link. Use the link below.",
        devMode: true,
        verificationUrl: url,
      });
    }

    return NextResponse.json({
      ok: true,
      message: devMode
        ? "Email delivery is not configured yet. Use the verification link below."
        : "Check your email for a new verification link.",
      ...(devMode ? { devMode: true, verificationUrl: url } : {}),
    });
  } catch (error) {
    console.error("[resend-verification] email failed:", error);
    return NextResponse.json({ error: "Could not send verification email. Try again later." }, { status: 503 });
  }
}
