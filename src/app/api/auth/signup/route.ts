import { NextResponse } from "next/server";
import { SIGNUP_CLOSED_MESSAGE } from "@/lib/signup-policy";

export async function POST() {
  return NextResponse.json({ error: SIGNUP_CLOSED_MESSAGE }, { status: 403 });
}
