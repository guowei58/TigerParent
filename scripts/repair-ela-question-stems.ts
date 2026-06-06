/**
 * Re-parse ELA MCQ stems from source PDF text and update truncated cleanedText/rawText.
 *
 * Usage:
 *   npx tsx --import dotenv/config scripts/repair-ela-question-stems.ts
 *   npx tsx --import dotenv/config scripts/repair-ela-question-stems.ts --dry-run
 *   npx tsx --import dotenv/config scripts/repair-ela-question-stems.ts --doc "3rd grade ELA NY2025"
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { extractPdfTextByPage } from "../src/lib/pdf/extractPdfText";
import { detectElaReadingProblems } from "../src/lib/pdf/detectElaReading";
import { isMcqQuestion } from "../src/lib/pdf/isMcqQuestion";
import { resolveDataPath } from "../src/lib/storage/fileStorage";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    docFilter: args.find((a, i) => args[i - 1] === "--doc") ?? null,
  };
}


async function main() {
  const { dryRun, docFilter } = parseArgs();

  const docs = await prisma.pdfSourceDocument.findMany({
    where: {
      ingestionLayout: "ela_reading_passages",
      ...(docFilter ? { fileName: { contains: docFilter, mode: "insensitive" } } : {}),
    },
    select: { id: true, fileName: true, originalFilePath: true, answerKeyPageCount: true },
  });

  if (docs.length === 0) {
    console.log("No ELA documents found.");
    return;
  }

  let updated = 0;
  let scanned = 0;

  for (const doc of docs) {
    const pdfPath = resolveDataPath(doc.originalFilePath);
    const pages = await extractPdfTextByPage(pdfPath);
    const detected = detectElaReadingProblems(pages, doc.answerKeyPageCount ?? 1);

    const byProblemNumber = new Map<number, (typeof detected.regions)[0]>();
    for (const r of detected.regions) {
      byProblemNumber.set(r.problemNumber, r);
    }

    const problems = await prisma.pdfPracticeProblem.findMany({
      where: { sourceDocumentId: doc.id },
      select: {
        id: true,
        problemNumber: true,
        sourcePageStart: true,
        cleanedText: true,
        rawText: true,
        questionType: true,
        choices: { select: { label: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { problemNumber: "asc" },
    });

    console.log(`\n=== ${doc.fileName} (${problems.length} problems) ===`);

    for (const p of problems) {
      scanned++;
      const fresh = byProblemNumber.get(p.problemNumber);
      if (!fresh || !isMcqQuestion(p.questionType, p.choices)) continue;

      const newStem = fresh.cleanedText?.trim() ?? "";
      const oldStem = (p.cleanedText ?? "").split("\n")[0]?.trim() ?? "";
      if (!newStem || newStem === oldStem) continue;

      const newRaw = fresh.rawText;
      console.log(`  Q${p.problemNumber}: "${oldStem.slice(0, 50)}" → "${newStem.slice(0, 60)}"`);

      if (!dryRun) {
        await prisma.pdfPracticeProblem.update({
          where: { id: p.id },
          data: {
            cleanedText: newStem,
            rawText: newRaw,
            sourcePageStart: fresh.pageNumber,
            sourcePageEnd: fresh.pageNumber,
          },
        });
      }
      updated++;
    }
  }

  console.log(
    `\nDone. Scanned ${scanned} problems, ${dryRun ? "would update" : "updated"} ${updated}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
