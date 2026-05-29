import "dotenv/config";
import { prisma } from "../src/lib/db";

const doc = "cmppukphe0018skvmg3dmpy7z";
const nums = [13, 16, 18, 20, 24];

async function main() {
  for (const n of nums) {
    const p = await prisma.pdfPracticeProblem.findFirst({
      where: { sourceDocumentId: doc, problemNumber: n },
      select: { id: true },
    });
    console.log(n, p?.id);
  }
}

main().finally(() => prisma.$disconnect());
