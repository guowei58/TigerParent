import { prisma } from "../src/lib/db";

const id = process.argv[2]!;
async function main() {
  const doc = await prisma.pdfSourceDocument.findUnique({
    where: { id },
    include: {
      ingestionJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { problems: true, pages: true } },
    },
  });
  console.log(JSON.stringify(doc, null, 2));
}
main().finally(() => prisma.$disconnect());
