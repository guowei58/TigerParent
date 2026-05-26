import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || password.length < 8) {
    return NextResponse.json(
      { error: "A valid token and password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  let email =
    (await consumeAuthToken(token, "PASSWORD_RESET")) ??
    (await consumeAuthToken(token, "STUDENT_INVITE"));

  if (!email) {
    return NextResponse.json(
      { error: "This link is invalid or has expired. Request a new one." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email },
    data: {
      password: passwordHash,
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
}
