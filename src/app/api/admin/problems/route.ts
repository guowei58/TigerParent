import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const problem = await prisma.problem.create({
    data: {
      ...body,
      difficulty: 1,
      tagsJson: [],
      mistakeCategoriesJson: ["general_error"],
      approved: true,
      aiGenerated: false,
    },
  });
  return NextResponse.json(problem);
}
