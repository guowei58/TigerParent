import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
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
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.pdfSourceDocument.findUnique({
    where: { id },
    include: {
      answerKey: true,
      problems: {
        where: { approvedForStudentUse: false },
        include: {
          solution: { select: { correctAnswerText: true } },
          choices: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { problemNumber: "asc" },
      },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const keyByNumber = new Map(doc.answerKey.map((k) => [k.problemNumber, k]));
  const toApprove: string[] = [];
  const skipped: { problemNumber: number; reason: string }[] = [];

  for (const problem of doc.problems) {
    const input = buildApproveCheckInput(
      problem,
      keyByNumber.get(problem.problemNumber) ?? null,
    );

    const blockReason = pdfProblemApprovalBlockReason(input);
    if (blockReason) {
      skipped.push({ problemNumber: problem.problemNumber, reason: blockReason });
      continue;
    }

    if (canApprovePdfProblem(input)) {
      toApprove.push(problem.id);
    }
  }

  if (toApprove.length > 0) {
    await prisma.pdfPracticeProblem.updateMany({
      where: { id: { in: toApprove } },
      data: { approvedForStudentUse: true, reviewStatus: "approved" },
    });
  }

  const alreadyApproved = await prisma.pdfPracticeProblem.count({
    where: { sourceDocumentId: id, approvedForStudentUse: true },
  });

  return NextResponse.json({
    ok: true,
    approved: toApprove.length,
    skipped,
    alreadyApproved,
    totalProblems: await prisma.pdfPracticeProblem.count({ where: { sourceDocumentId: id } }),
  });
}
