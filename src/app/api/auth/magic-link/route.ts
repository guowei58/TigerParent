import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, sendMagicLinkEmail } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond success to avoid email enumeration
  if (!user) {
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, we sent a sign-in link.",
    });
  }

  if (!user.emailVerified && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Please verify your email first. Check your inbox for the verification link." },
      { status: 403 },
    );
  }

  try {
    const { url, sent, devMode, error } = await sendMagicLinkEmail(email, user.name);

    if (!sent) {
      return NextResponse.json({
        ok: true,
        message: error ?? "Could not email the sign-in link. Use the link below.",
        devMode: true,
        signInUrl: url,
      });
    }

    return NextResponse.json({
      ok: true,
      message: devMode
        ? "Email delivery is not configured yet. Use the sign-in link below."
        : "Check your email for a sign-in link.",
      ...(devMode ? { devMode: true, signInUrl: url } : {}),
    });
  } catch (error) {
    console.error("[magic-link] email failed:", error);
    return NextResponse.json({ error: "Could not send email. Try again later." }, { status: 503 });
  }
}
