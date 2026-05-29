import "dotenv/config";
import { prisma } from "../src/lib/db";
import { detectProblemsOnePerPage } from "../src/lib/pdf/detectProblems";
import { parseAnswerKey } from "../src/lib/pdf/parseAnswerKey";

const docId = process.argv[2] ?? "cmppukphe0018skvmg3dmpy7z";

async function main() {
  const probs = await prisma.pdfPracticeProblem.findMany({
    where: { sourceDocumentId: docId },
    select: { problemNumber: true, questionType: true },
    orderBy: { problemNumber: "asc" },
  });
  console.log(
    "problems",
    probs.length,
    probs.map((p) => `${p.problemNumber}:${p.questionType}`).join(", "),
  );

  const doc = await prisma.pdfSourceDocument.findUniqueOrThrow({ where: { id: docId } });
  const pages = await prisma.pdfPage.findMany({
    where: { sourceDocumentId: docId },
    orderBy: { pageNumber: "asc" },
  });
  const { answerKeySection } = detectProblemsOnePerPage(
    pages.map((p) => ({ pageNumber: p.pageNumber, text: p.textRaw ?? "" })),
    doc.answerKeyPageCount,
  );
  console.log("answer key section length", answerKeySection.length);
  console.log(answerKeySection.slice(0, 2000));

  const entries = parseAnswerKey(answerKeySection);
  console.log("\nparsed", entries.length);
  for (const e of entries.slice(0, 30)) {
    console.log(e.problemNumber, e.correctChoiceLabel ?? e.correctAnswerText);
  }
}

main().finally(() => prisma.$disconnect());
