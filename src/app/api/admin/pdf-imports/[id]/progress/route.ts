import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

const TERMINAL_STATUSES = new Set(["needs_review", "completed", "failed"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const job = await prisma.pdfIngestionJob.findFirst({
    where: { sourceDocumentId: id },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    return NextResponse.json({ error: "No ingestion job" }, { status: 404 });
  }

  const completed = TERMINAL_STATUSES.has(job.status);

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    currentStep: job.currentStep,
    progressPercent: job.progressPercent ?? 0,
    completed,
    errorMessage: job.errorMessage,
    totalPages: job.totalPages,
    totalProblemsDetected: job.totalProblemsDetected,
    updatedAt: job.updatedAt,
  });
}
