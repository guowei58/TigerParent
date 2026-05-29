import { prisma } from "../src/lib/db";
import fs from "fs";

const docId = process.argv[2];

async function main() {
  const docs = docId
    ? [{ id: docId }]
    : await prisma.pdfSourceDocument.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, title: true },
      });

  for (const d of docs) {
    console.log("\n===", d.title ?? d.id, "===");
    const p = await prisma.pdfPracticeProblem.findFirst({
      where: { sourceDocumentId: d.id, problemNumber: 1 },
    });
    if (!p) {
      console.log("no problem 1");
      continue;
    }
    console.log({
      problemImagePath: p.problemImagePath,
      fullPageImagePath: p.fullPageImagePath,
      studentDisplayMode: p.studentDisplayMode,
      requiresImage: p.requiresImage,
    });
    for (const path of [p.problemImagePath, p.fullPageImagePath]) {
      if (!path) continue;
      console.log("  exists:", fs.existsSync(path), path);
    }
  }
}

main().finally(() => prisma.$disconnect());
