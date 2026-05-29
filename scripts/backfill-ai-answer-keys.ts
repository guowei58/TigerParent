import { prisma } from "../src/lib/db";
import { ensureAiAnswerKeyForProblem, needsAiDerivedAnswerKey } from "../src/lib/pdf/aiAnswerKey";

const docId = process.argv[2];
const delayMs = parseInt(process.argv[3] ?? "400", 10);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const problems = await prisma.pdfPracticeProblem.findMany({
    where: docId ? { sourceDocumentId: docId } : undefined,
    orderBy: [{ sourceDocumentId: "asc" }, { problemNumber: "asc" }],
    include: { choices: { orderBy: { sortOrder: "asc" } } },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Processing ${problems.length} problems (delay ${delayMs}ms between AI calls)…`);

  for (let i = 0; i < problems.length; i++) {
    const p = problems[i]!;
    const key = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: p.sourceDocumentId,
          problemNumber: p.problemNumber,
        },
      },
    });

    const choiceRows = p.choices.map((c) => ({ label: c.label, text: c.text }));
    const needsAi = needsAiDerivedAnswerKey(p.questionType, choiceRows, key);

    process.stdout.write(`[${i + 1}/${problems.length}] #${p.problemNumber} `);

    if (!needsAi) {
      skipped++;
      console.log("skip (MCQ with PDF key)");
      continue;
    }

    try {
      const result = await ensureAiAnswerKeyForProblem({
        id: p.id,
        sourceDocumentId: p.sourceDocumentId,
        problemNumber: p.problemNumber,
        questionType: p.questionType,
        rawText: p.rawText,
        cleanedText: p.cleanedText,
        gradeLevel: p.gradeLevel,
        subject: p.subject,
        subtopic: p.subtopic,
        choices: choiceRows,
        key: key
          ? {
              id: key.id,
              correctChoiceLabel: key.correctChoiceLabel,
              correctAnswerText: key.correctAnswerText,
              rawAnswerText: key.rawAnswerText,
            }
          : null,
      });
      updated++;
      console.log(`→ ${result.answerText} (${result.modelUsed})`);
    } catch (err) {
      failed++;
      console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
    }

    if (i < problems.length - 1) await sleep(delayMs);
  }

  console.log(`\nDone. Updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
}

main().finally(() => prisma.$disconnect());
