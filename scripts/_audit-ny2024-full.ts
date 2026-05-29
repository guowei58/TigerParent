import "dotenv/config";
import { prisma } from "../src/lib/db";

const docId = process.argv[2] ?? "cmppukphe0018skvmg3dmpy7z";

async function main() {
  const probs = await prisma.pdfPracticeProblem.findMany({
    where: { sourceDocumentId: docId },
    orderBy: { problemNumber: "asc" },
    include: { solution: true, choices: true },
  });
  for (const p of probs) {
    const k = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: docId,
          problemNumber: p.problemNumber,
        },
      },
    });
    console.log(
      String(p.problemNumber).padStart(2),
      p.questionType.padEnd(18),
      "key",
      (k?.correctChoiceLabel ?? "-").padEnd(3),
      (k?.correctAnswerText ?? "-").slice(0, 12).padEnd(12),
      "sol",
      (p.solution?.correctChoiceLabel ?? "-").padEnd(3),
      (p.solution?.correctAnswerText ?? "-").slice(0, 20).padEnd(20),
      p.solution?.generatedByModel ?? "-",
    );
  }
}

main().finally(() => prisma.$disconnect());
