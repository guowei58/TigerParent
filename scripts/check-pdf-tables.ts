import { prisma } from "../src/lib/db";

async function main() {
  try {
    const c = await prisma.pdfSourceDocument.count();
    console.log("pdf tables ok, count", c);
  } catch (e) {
    console.log("missing:", (e as Error).message);
  }
}

main().finally(() => prisma.$disconnect());
