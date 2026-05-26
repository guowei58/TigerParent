import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizeEmail, sendVerificationEmail } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in." },
      { status: 409 },
    );
  }

  const family = await prisma.organization.create({
    data: { name: `${name.split(" ")[0]} Family`, type: "FAMILY" },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      password: passwordHash,
      role: "PARENT",
      familyId: family.id,
    },
  });

  try {
    const { url, sent, devMode, error } = await sendVerificationEmail(email, name);

    if (!sent) {
      return NextResponse.json({
        ok: true,
        message:
          error ??
          "Account created, but we could not email the verification link. Use the link below.",
        devMode: true,
        verificationUrl: url,
      });
    }

    return NextResponse.json({
      ok: true,
      message: devMode
        ? "Email delivery is not configured yet. Use the verification link below."
        : "Check your email to verify your account before signing in.",
      ...(devMode ? { devMode: true, verificationUrl: url } : {}),
    });
  } catch (error) {
    console.error("[signup] verification email failed:", error);
    return NextResponse.json(
      {
        error:
          "Account created but we could not send the verification email. Contact support or try again later.",
      },
      { status: 503 },
    );
  }
}
