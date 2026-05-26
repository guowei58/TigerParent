import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const token = typeof body.token === "string" ? body.token : "";

  if (!token) {
    return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  }

  const email = await consumeAuthToken(token, "EMAIL_VERIFY");
  if (!email) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ ok: true, message: "Email verified. You can sign in now." });
}
