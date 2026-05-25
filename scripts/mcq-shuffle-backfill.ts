/**
 * Backfill MCQ choice IDs, shuffle order, and distractor rationales.
 * Run: npm run db:backfill-mcq
 */
import { prisma } from "../src/lib/db";
import {
  buildDistractorRationaleJson,
  buildMcqChoices,
} from "../src/lib/mcq-choices";

function hashProblemSeed(problemId: string): number {
  let hash = 0;
  for (let i = 0; i < problemId.length; i++) {
    hash = (hash * 31 + problemId.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

async function main() {
  const batchSize = 500;
  let cursor: string | undefined;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const problems = await prisma.problem.findMany({
      where: { type: "MULTIPLE_CHOICE", isActive: true },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        choicesJson: true,
        correctAnswer: true,
        explanation: true,
      },
    });
    if (!problems.length) break;

    for (const problem of problems) {
      const choices = Array.isArray(problem.choicesJson)
        ? (problem.choicesJson as string[])
        : [];
      if (choices.length < 2) {
        skipped += 1;
        continue;
      }

      const seed = hashProblemSeed(problem.id);
      const inputs = choices.map((text) => {
        const isCorrect =
          text.trim().toLowerCase() === problem.correctAnswer.trim().toLowerCase();
        return {
          text,
          isCorrect,
          rationale: isCorrect
            ? (problem.explanation ?? "This matches the question requirements.")
            : `Students may pick "${text}" due to a common misconception about this skill.`,
        };
      });

      if (!inputs.some((c) => c.isCorrect)) {
        skipped += 1;
        continue;
      }

      try {
        const built = buildMcqChoices(inputs, seed);
        await prisma.problem.update({
          where: { id: problem.id },
          data: {
            choicesJson: built.choicesJson,
            choicesWithIdsJson: built.choices,
            correctChoiceId: built.correctChoiceId,
            distractorRationaleJson: buildDistractorRationaleJson(built.choices),
          },
        });
        updated += 1;
      } catch {
        skipped += 1;
      }
    }

    cursor = problems[problems.length - 1]?.id;
    console.log(`Updated ${updated} MCQs (${skipped} skipped)...`);
  }

  console.log(`Done. Backfilled ${updated} MCQ problems.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
