import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, sendPasswordResetEmail } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    try {
      await sendPasswordResetEmail(email, user.name);
    } catch (error) {
      console.error("[forgot-password] email failed:", error);
      return NextResponse.json({ error: "Could not send email. Try again later." }, { status: 503 });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, we sent password reset instructions.",
  });
}
