import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { spawn } from "child_process";
import path from "path";
import { saveUploadedPdf } from "@/lib/storage/fileStorage";

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
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=4096`.trim(),
      },
    },
  );
  child.stdout?.on("data", (d) => console.log("[pdf-ingest]", d.toString()));
  child.stderr?.on("data", (d) => console.error("[pdf-ingest]", d.toString()));
  child.unref();
}

export async function GET() {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;
  const session = admin.session;

  const docs = await prisma.pdfSourceDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      ingestionJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { problems: true } },
    },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(request: Request) {
  const admin = await requireAdminApiSession();
  if (admin.response) return admin.response;
  const session = admin.session;

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const title = String(form.get("title") ?? "").trim();
  const gradeLevel = parseInt(String(form.get("gradeLevel") ?? "5"), 10);
  const subject = String(form.get("subject") ?? "math").trim();
  const jurisdiction = String(form.get("jurisdiction") ?? "").trim() || null;
  const confirmDuplicate = form.get("confirmDuplicate") === "true";
  const ingestionLayout =
    String(form.get("ingestionLayout") ?? "one_problem_per_page") === "auto_detect"
      ? "auto_detect"
      : String(form.get("ingestionLayout") ?? "") === "ela_reading_passages"
        ? "ela_reading_passages"
        : "one_problem_per_page";
  const answerKeyPageCount = Math.max(
    0,
    Math.min(50, parseInt(String(form.get("answerKeyPageCount") ?? "1"), 10) || 1),
  );

  if (!file || !title) {
    return NextResponse.json({ error: "PDF file and title are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storedPath, hash } = saveUploadedPdf(file.name, buffer);

  const existing = await prisma.pdfSourceDocument.findUnique({ where: { sha256Hash: hash } });
  if (existing && !confirmDuplicate) {
    return NextResponse.json(
      { error: "duplicate", existingId: existing.id, message: "PDF already imported" },
      { status: 409 },
    );
  }

  const doc = await prisma.pdfSourceDocument.create({
    data: {
      title,
      fileName: file.name,
      originalFilePath: storedPath,
      sha256Hash: hash,
      gradeLevel,
      subject,
      jurisdiction,
      ingestionLayout,
      answerKeyPageCount,
      importStatus: "uploaded",
      createdByAdminId: session!.user.id,
    },
  });

  const job = await prisma.pdfIngestionJob.create({
    data: { sourceDocumentId: doc.id, status: "uploaded", currentStep: "queued" },
  });

  startIngestionWorker(doc.id, job.id);

  return NextResponse.json({ documentId: doc.id, jobId: job.id });
}
