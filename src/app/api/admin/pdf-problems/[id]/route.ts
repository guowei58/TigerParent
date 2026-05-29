import fs from "fs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { resolveDataPath } from "@/lib/storage/fileStorage";

function tryDeleteFile(storedPath: string | null | undefined) {
  if (!storedPath) return;
  try {
    const abs = resolveDataPath(storedPath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (error) {
    console.warn("Failed to delete PDF asset:", storedPath, error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id },
    select: {
      id: true,
      problemNumber: true,
      sourceDocumentId: true,
      problemImagePath: true,
      fullPageImagePath: true,
      choices: { select: { imagePath: true } },
    },
  });

  if (!problem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.pdfPracticeProblem.delete({ where: { id: problem.id } }),
    prisma.pdfAnswerKeyEntry.deleteMany({
      where: {
        sourceDocumentId: problem.sourceDocumentId,
        problemNumber: problem.problemNumber,
      },
    }),
  ]);

  tryDeleteFile(problem.problemImagePath);
  for (const choice of problem.choices) {
    tryDeleteFile(choice.imagePath);
  }

  const remaining = await prisma.pdfPracticeProblem.count({
    where: { sourceDocumentId: problem.sourceDocumentId },
  });

  return NextResponse.json({
    ok: true,
    sourceDocumentId: problem.sourceDocumentId,
    problemNumber: problem.problemNumber,
    remainingProblems: remaining,
  });
}
