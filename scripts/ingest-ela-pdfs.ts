/**
 * Upload and ingest ELA PDFs from PracticeProblems folder.
 * Usage: npx tsx --import dotenv/config scripts/ingest-ela-pdfs.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";
import { saveUploadedPdf } from "../src/lib/storage/fileStorage";
import { spawn } from "child_process";

const FILES = [
  {
    path: "PracticeProblems/2025_grade3_ela_released_items_landscape.pdf",
    title: "3rd grade ELA NY2025",
    gradeLevel: 3,
  },
  {
    path: "PracticeProblems/2013_grade8_ela_sample_annotated_items_landscape.pdf",
    title: "8th grade ELA NY2013 sample",
    gradeLevel: 8,
  },
];

function runIngestion(docId: string, jobId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "run-pdf-ingestion-job.ts");
    const child = spawn(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        "--env-file",
        path.join(process.cwd(), ".env"),
        script,
        docId,
        jobId,
      ],
      { cwd: process.cwd(), stdio: "inherit", env: process.env },
    );
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

async function main() {
  for (const file of FILES) {
    const abs = path.join(process.cwd(), file.path);
    if (!fs.existsSync(abs)) {
      console.error("Missing", abs);
      continue;
    }
    const buffer = fs.readFileSync(abs);
    const { storedPath, hash } = saveUploadedPdf(path.basename(abs), buffer);

    const existing = await prisma.pdfSourceDocument.findUnique({ where: { sha256Hash: hash } });
    if (existing) {
      console.log("Already imported:", existing.title, existing.id);
      continue;
    }

    const doc = await prisma.pdfSourceDocument.create({
      data: {
        title: file.title,
        fileName: path.basename(abs),
        originalFilePath: storedPath,
        sha256Hash: hash,
        gradeLevel: file.gradeLevel,
        subject: "english",
        jurisdiction: "NY",
        ingestionLayout: "ela_reading_passages",
        answerKeyPageCount: 1,
        importStatus: "uploaded",
      },
    });
    const job = await prisma.pdfIngestionJob.create({
      data: { sourceDocumentId: doc.id, status: "uploaded", currentStep: "queued" },
    });
    console.log("\nIngesting", file.title, "…");
    await runIngestion(doc.id, job.id);
    const count = await prisma.pdfPracticeProblem.count({ where: { sourceDocumentId: doc.id } });
    console.log("Done:", count, "problems for", file.title);
  }
}

main().finally(() => prisma.$disconnect());
