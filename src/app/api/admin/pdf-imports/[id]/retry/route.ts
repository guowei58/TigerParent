import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { requireAdminApiSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

function startIngestionWorker(sourceDocumentId: string, jobId: string) {
  const script = path.join(process.cwd(), "scripts", "run-pdf-ingestion-job.ts");
  const child = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      "--env-file",
      path.join(process.cwd(), ".env"),
      script,
      sourceDocumentId,
      jobId,
    ],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=4096`.trim(),
      },
    },
  );
  child.unref();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;

  const { id } = await params;
  const doc = await prisma.pdfSourceDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const job = await prisma.pdfIngestionJob.create({
    data: {
      sourceDocumentId: id,
      status: "uploaded",
      currentStep: "retry_queued",
    },
  });

  await prisma.pdfSourceDocument.update({
    where: { id },
    data: { importStatus: "uploaded" },
  });

  startIngestionWorker(id, job.id);

  return NextResponse.json({ jobId: job.id });
}
