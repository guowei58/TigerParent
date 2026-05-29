import { prisma } from "../src/lib/db";
import { detectProblemsOnePerPage } from "../src/lib/pdf/detectProblems";
import { parseAnswerKey } from "../src/lib/pdf/parseAnswerKey";

async function main() {
  const doc = await prisma.pdfSourceDocument.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      problems: {
        orderBy: { problemNumber: "asc" },
        include: { solution: true, choices: { orderBy: { sortOrder: "asc" } } },
      },
      answerKey: { orderBy: { problemNumber: "asc" } },
    },
  });
  if (!doc) {
    console.log("No doc");
    return;
  }

  console.log("DOC", {
    id: doc.id,
    title: doc.title,
    pageCount: doc.pageCount,
    answerKeyPageCount: doc.answerKeyPageCount,
    layout: doc.ingestionLayout,
    problems: doc.problems.length,
    answerKeyRows: doc.answerKey.length,
  });

  const pagesForDetect = doc.pages.map((p) => ({
    pageNumber: p.pageNumber,
    text: p.textRaw ?? "",
  }));

  const detected = detectProblemsOnePerPage(pagesForDetect, doc.answerKeyPageCount);
  const reparsed = parseAnswerKey(detected.answerKeySection);

  console.log("\nDetection:", {
    problemPages: detected.problemPageCount,
    answerKeyPages: detected.answerKeyPageCount,
    regions: detected.regions.length,
    reparsedKeyCount: reparsed.length,
  });

  console.log("\n--- Answer key page raw text (first 2500 chars) ---");
  console.log(detected.answerKeySection.slice(0, 2500));

  console.log("\n--- DB answer key (first 15) ---");
  for (const k of doc.answerKey.slice(0, 15)) {
    console.log(k.problemNumber, "->", k.correctChoiceLabel ?? k.correctAnswerText, "|", k.rawAnswerText.slice(0, 60));
  }

  console.log("\n--- Reparsed from stored pages (first 15) ---");
  for (const k of reparsed.slice(0, 15)) {
    console.log(k.problemNumber, "->", k.correctChoiceLabel ?? k.correctAnswerText, "|", k.rawAnswerText.slice(0, 60));
  }

  console.log("\n--- Mismatches: problem vs solution ---");
  const keyMap = new Map(doc.answerKey.map((k) => [k.problemNumber, k]));
  for (const p of doc.problems.slice(0, 20)) {
    const key = keyMap.get(p.problemNumber);
    const sol = p.solution;
    console.log({
      page: p.sourcePageStart,
      problemNum: p.problemNumber,
      dbKey: key?.correctChoiceLabel ?? key?.correctAnswerText ?? "MISSING",
      solution: sol?.correctChoiceLabel ?? sol?.correctAnswerText ?? "none",
      choices: p.choices.map((c) => c.label).join(","),
    });
  }

  console.log("\n--- Problem numbers vs page numbers ---");
  const pageNums = doc.problems.map((p) => ({ pn: p.problemNumber, page: p.sourcePageStart }));
  console.log(pageNums.slice(0, 10), "...", pageNums.slice(-5));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
