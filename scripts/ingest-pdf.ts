/**
 * CLI: ingest a PDF file into the PDF practice system.
 * Usage: npx tsx --env-file=.env scripts/ingest-pdf.ts path/to/file.pdf --title "My PDF" --grade 5
 */
import fs from "fs";
import { prisma } from "../src/lib/db";
import { saveUploadedPdf } from "../src/lib/storage/fileStorage";
import { runPdfIngestion } from "../src/lib/pdf/ingestPdf";

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Usage: ingest-pdf.ts <pdf-path> --title T --grade 5 [--subject math]");
    process.exit(1);
  }

  const title =
    args.find((a, i) => args[i - 1] === "--title") ?? filePath.split(/[/\\]/).pop()!;
  const grade = parseInt(args.find((a, i) => args[i - 1] === "--grade") ?? "5", 10);
  const subject = args.find((a, i) => args[i - 1] === "--subject") ?? "math";
  const jurisdiction = args.find((a, i) => args[i - 1] === "--state") ?? null;

  const buffer = fs.readFileSync(filePath);
  const { storedPath, hash } = saveUploadedPdf(filePath, buffer);

  const doc = await prisma.pdfSourceDocument.create({
    data: {
      title,
      fileName: filePath.split(/[/\\]/).pop()!,
      originalFilePath: storedPath,
      sha256Hash: hash,
      gradeLevel: grade,
      subject,
      jurisdiction,
      importStatus: "uploaded",
    },
  });

  const job = await prisma.pdfIngestionJob.create({
    data: { sourceDocumentId: doc.id, status: "uploaded" },
  });

  console.log("Ingesting", doc.id, "…");
  const audit = await runPdfIngestion(doc.id, job.id);
  console.log(JSON.stringify(audit, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
