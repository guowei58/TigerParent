/**
 * Re-ingest one English PDF by filename substring.
 * Usage: npx tsx --import dotenv/config scripts/reingest-ela-doc.ts 2025_grade3_ela
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runPdfIngestion } from "../src/lib/pdf/ingestPdf";

async function main() {
  const needle = process.argv[2] ?? "2025_grade3_ela";
  const doc = await prisma.pdfSourceDocument.findFirst({
    where: { fileName: { contains: needle, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (!doc) {
    console.error("Document not found for:", needle);
    process.exit(1);
  }

  console.log(`Re-ingesting ${doc.fileName} (${doc.id})…`);
  await prisma.pdfSourceDocument.update({
    where: { id: doc.id },
    data: { ingestionLayout: "ela_reading_passages" },
  });

  const job = await prisma.pdfIngestionJob.create({
    data: {
      sourceDocumentId: doc.id,
      status: "uploaded",
      currentStep: "retry_queued",
    },
  });

  await runPdfIngestion(doc.id, job.id);

  const q1 = await prisma.pdfPracticeProblem.findFirst({
    where: { sourceDocumentId: doc.id, problemNumber: 1 },
    include: { choices: { orderBy: { sortOrder: "asc" } } },
  });
  console.log("Q1 D:", q1?.choices[3]?.text);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
