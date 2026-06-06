/**
 * Re-ingest English PDFs that were uploaded with the wrong (math) layout.
 * Usage: npx tsx --import dotenv/config scripts/retry-english-ela-imports.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runPdfIngestion } from "../src/lib/pdf/ingestPdf";

async function main() {
  const docs = await prisma.pdfSourceDocument.findMany({
    where: {
      subject: "english",
      ingestionLayout: "one_problem_per_page",
    },
    select: { id: true, fileName: true },
  });

  if (docs.length === 0) {
    console.log("No English PDFs with wrong layout found.");
    return;
  }

  for (const doc of docs) {
    console.log(`\nRe-ingesting ${doc.fileName} (${doc.id})…`);
    const job = await prisma.pdfIngestionJob.create({
      data: {
        sourceDocumentId: doc.id,
        status: "uploaded",
        currentStep: "retry_queued",
      },
    });
    await prisma.pdfSourceDocument.update({
      where: { id: doc.id },
      data: { importStatus: "uploaded", ingestionLayout: "ela_reading_passages" },
    });
    await runPdfIngestion(doc.id, job.id);
    const after = await prisma.pdfPracticeProblem.findFirst({
      where: { sourceDocumentId: doc.id },
      include: { choices: true, passage: true },
      orderBy: { problemNumber: "asc" },
    });
    console.log(
      `  Done. Sample Q1: passage=${after?.passageId ? "yes" : "no"} choices=${after?.choices.length ?? 0}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
