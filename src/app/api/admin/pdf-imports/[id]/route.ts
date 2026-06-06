import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { deletePdfImportDocument } from "@/lib/pdf/deletePdfImport";
import { assetUrl, elaQuestionDisplayImagePath, problemDisplayImagePath } from "@/lib/pdf/displayPaths";

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
    problemImageUrl: assetUrl(
      p.passageId ? elaQuestionDisplayImagePath(p) : problemDisplayImagePath(p),
      p.updatedAt.getTime(),
    ),
    fullPageImageUrl: assetUrl(p.fullPageImagePath, p.updatedAt.getTime()),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.pdfSourceDocument.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { title?: unknown; gradeLevel?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { title?: string; gradeLevel?: number | null } = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    data.title = title;
  }

  if (body.gradeLevel !== undefined) {
    if (body.gradeLevel === null || body.gradeLevel === "") {
      data.gradeLevel = null;
    } else {
      const gradeLevel =
        typeof body.gradeLevel === "number"
          ? body.gradeLevel
          : parseInt(String(body.gradeLevel), 10);
      if (!Number.isFinite(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
        return NextResponse.json({ error: "Grade must be between 1 and 12" }, { status: 400 });
      }
      data.gradeLevel = gradeLevel;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pdfSourceDocument.update({ where: { id }, data });
    if (data.gradeLevel !== undefined) {
      await tx.pdfPracticeProblem.updateMany({
        where: { sourceDocumentId: id },
        data: { gradeLevel: data.gradeLevel },
      });
    }
  });

  const updated = await prisma.pdfSourceDocument.findUnique({
    where: { id },
    select: { id: true, title: true, gradeLevel: true },
  });

  return NextResponse.json({ ok: true, document: updated });
}
