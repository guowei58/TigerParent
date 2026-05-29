import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  for (const n of [16, 18, 21, 23]) {
    const p = await prisma.pdfPracticeProblem.findFirst({
      where: { sourceDocumentId: "cmppukphe0018skvmg3dmpy7z", problemNumber: n },
      include: { solution: true, choices: true },
    });
    const k = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: "cmppukphe0018skvmg3dmpy7z",
          problemNumber: n,
        },
      },
    });
    console.log("\n#", n, p?.questionType, "choices", p?.choices.length);
    console.log("key", k?.correctChoiceLabel, k?.correctAnswerText);
    console.log("sol", p?.solution?.correctChoiceLabel, p?.solution?.generatedByModel);
    console.log("expl", p?.solution?.explanationStepByStep?.slice(0, 100));
  }
}

main().finally(() => prisma.$disconnect());
