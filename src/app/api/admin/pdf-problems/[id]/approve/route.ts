import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import {
  buildApproveCheckInput,
  canApprovePdfProblem,
  pdfProblemApprovalBlockReason,
} from "@/lib/pdf/approveProblem";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;

  const { id } = await params;
  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id },
    include: {
      solution: true,
      choices: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = await prisma.pdfAnswerKeyEntry.findUnique({
    where: {
      sourceDocumentId_problemNumber: {
        sourceDocumentId: problem.sourceDocumentId,
        problemNumber: problem.problemNumber,
      },
    },
  });

  const check = buildApproveCheckInput(problem, key);
  const blockReason = pdfProblemApprovalBlockReason(check);

  if (blockReason === "no image") {
    return NextResponse.json({ error: "Problem has no image crop" }, { status: 400 });
  }

  if (blockReason === "no answer key") {
    return NextResponse.json(
      { error: "No answer key — add answer before approval" },
      { status: 400 },
    );
  }

  if (!canApprovePdfProblem(check)) {
    return NextResponse.json({ error: "Problem cannot be approved" }, { status: 400 });
  }

  await prisma.pdfPracticeProblem.update({
    where: { id },
    data: { approvedForStudentUse: true, reviewStatus: "approved" },
  });

  return NextResponse.json({ ok: true });
}
