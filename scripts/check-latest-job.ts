import { prisma } from "../src/lib/db";

const docId = process.argv[2] ?? "cmpnhm83100001svmscgl00hp";

async function main() {
  const job = await prisma.pdfIngestionJob.findFirst({
    where: { sourceDocumentId: docId },
    orderBy: { createdAt: "desc" },
  });
  console.log(JSON.stringify(job, null, 2));
}

main().finally(() => prisma.$disconnect());
