import "../src/lib/pdf/setupPdfJs";
import { prisma } from "../src/lib/db";
import { runPdfIngestion } from "../src/lib/pdf/ingestPdf";

const docId = process.argv[2];
if (!docId) {
  console.error("Usage: retry-pdf-doc.ts <sourceDocumentId>");
  process.exit(1);
}

async function main() {
  const job = await prisma.pdfIngestionJob.create({
    data: { sourceDocumentId: docId, status: "uploaded", currentStep: "retry" },
  });
  await prisma.pdfSourceDocument.update({
    where: { id: docId },
    data: { importStatus: "uploaded" },
  });
  console.log("Running job", job.id);
  const audit = await runPdfIngestion(docId, job.id);
  console.log(JSON.stringify(audit, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
