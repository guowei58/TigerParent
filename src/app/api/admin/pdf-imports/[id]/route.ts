import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { deletePdfImportDocument } from "@/lib/pdf/deletePdfImport";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";

export async function GET(
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
      ingestionJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      pages: { orderBy: { pageNumber: "asc" } },
      problems: {
        orderBy: { problemNumber: "asc" },
        include: {
          choices: true,
          solution: true,
          primaryConcept: true,
          conceptLinks: { include: { concept: true } },
        },
      },
      answerKey: { orderBy: { problemNumber: "asc" } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const problems = doc.problems.map((p) => ({
    ...p,
    problemImageUrl: assetUrl(problemDisplayImagePath(p)),
    fullPageImageUrl: assetUrl(p.fullPageImagePath),
  }));

  return NextResponse.json({ document: { ...doc, problems } });
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
  const result = await deletePdfImportDocument(id);

  if (!result.deleted) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    problemsDeleted: result.problemCount,
  });
}
