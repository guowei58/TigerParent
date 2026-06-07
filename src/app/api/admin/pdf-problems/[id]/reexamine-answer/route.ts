import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth/admin";
import { reexamineProblemAnswer } from "@/lib/pdf/reexamineProblemAnswer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;

  const { id } = await params;

  try {
    const result = await reexamineProblemAnswer(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[reexamine-answer]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reexamine answer",
      },
      { status: 500 },
    );
  }
}
