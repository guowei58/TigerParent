import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { registerContentSource } from "@/lib/content-provenance/import-pipeline";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const source = await registerContentSource(body);
  return NextResponse.json({ source });
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { prisma } = await import("@/lib/db");
  const sources = await prisma.contentSource.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { problems: true } } },
  });
  return NextResponse.json({ sources });
}
