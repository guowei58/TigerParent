import { prisma } from "../src/lib/db";
import { detectProblemsOnePerPage } from "../src/lib/pdf/detectProblems";
import { parseAnswerKey } from "../src/lib/pdf/parseAnswerKey";

const docId = process.argv[2] ?? "cmpnklaau0000h0vmrnuuhju9";

async function main() {
  const doc = await prisma.pdfSourceDocument.findUniqueOrThrow({ where: { id: docId } });
  const pages = await prisma.pdfPage.findMany({
    where: { sourceDocumentId: docId },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true, textRaw: true },
  });
  const pagesForDetect = pages.map((p) => ({
    pageNumber: p.pageNumber,
    text: p.textRaw ?? "",
  }));
  const { answerKeySection, answerKeyPageCount } = detectProblemsOnePerPage(
    pagesForDetect,
    doc.answerKeyPageCount,
  );
  console.log("doc", doc.title, "pages", pages.length, "answer key pages", answerKeyPageCount);
  console.log("answer key section length", answerKeySection.length);
  console.log("--- sample (first 2000 chars) ---");
  console.log(answerKeySection.slice(0, 2000));
  console.log("--- entries ---");
  const entries = parseAnswerKey(answerKeySection);
  console.log("parsed", entries.length);
  console.log(entries.slice(0, 15));
  const e1 = entries.find((e) => e.problemNumber === 1);
  console.log("problem 1 entry", e1);
}

main().finally(() => prisma.$disconnect());
