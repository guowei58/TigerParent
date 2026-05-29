/**
 * Run PDF ingestion outside Next.js (avoids pdf.js worker bundling issues).
 * Usage: npx tsx --env-file=.env scripts/run-pdf-ingestion-job.ts <sourceDocumentId> <jobId>
 */
import { prisma } from "../src/lib/db";
import { runPdfIngestion } from "../src/lib/pdf/ingestPdf";

async function main() {
  const [sourceDocumentId, jobId] = process.argv.slice(2);
  if (!sourceDocumentId || !jobId) {
    console.error("Usage: run-pdf-ingestion-job.ts <sourceDocumentId> <jobId>");
    process.exit(1);
  }
  await runPdfIngestion(sourceDocumentId, jobId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
