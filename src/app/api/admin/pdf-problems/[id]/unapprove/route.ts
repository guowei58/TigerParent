import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;

  const { id } = await params;
  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id },
    select: { id: true, approvedForStudentUse: true },
  });
  if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!problem.approvedForStudentUse) {
    return NextResponse.json({ error: "Problem is not approved" }, { status: 400 });
  }

  await prisma.pdfPracticeProblem.update({
    where: { id },
    data: { approvedForStudentUse: false, reviewStatus: "needs_review" },
  });

  return NextResponse.json({ ok: true });
}
