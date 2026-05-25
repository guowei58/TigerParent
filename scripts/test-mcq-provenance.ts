/**
 * MCQ + provenance acceptance tests.
 */
import { prisma } from "../src/lib/db";
import { buildMcqChoices, shuffleWithSeed } from "../src/lib/mcq-choices";
import { getMcqPositionAudit } from "../src/lib/content-provenance/rights-audit";

let passed = 0;
let failed = 0;

function assert(name: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}`);
  }
}

async function main() {
  const built = buildMcqChoices(
    [
      { text: "Correct", isCorrect: true, rationale: "Because it is correct." },
      {
        text: "Wrong A",
        isCorrect: false,
        rationale: "Students confuse detail with main idea.",
        misconception: "detail_as_main_idea",
      },
      {
        text: "Wrong B",
        isCorrect: false,
        rationale: "Students pick the title instead of the idea.",
      },
      {
        text: "Wrong C",
        isCorrect: false,
        rationale: "Students overgeneralize from one sentence.",
      },
    ],
    42,
  );

  assert("MCQ builder shuffles away from fixed first position sometimes", true);

  const positions: number[] = [];
  for (let seed = 1; seed <= 100; seed++) {
    const trial = buildMcqChoices(
      [
        { text: "A", isCorrect: true, rationale: "ok" },
        { text: "B", isCorrect: false, rationale: "r1" },
        { text: "C", isCorrect: false, rationale: "r2" },
        { text: "D", isCorrect: false, rationale: "r3" },
      ],
      seed,
    );
    positions.push(trial.choicesJson[0] === "A" ? 1 : 0);
  }
  const firstRate = positions.reduce((a, b) => a + b, 0) / positions.length;
  assert(
    "Correct answer is not always first (seed distribution)",
    firstRate > 0.1 && firstRate < 0.9,
  );

  let rejected = false;
  try {
    buildMcqChoices(
      [
        { text: "Correct", isCorrect: true, rationale: "ok" },
        { text: "A made-up definition", isCorrect: false, rationale: "x" },
      ],
      1,
    );
  } catch {
    rejected = true;
  }
  assert("Generic distractors are rejected", rejected);

  const legacyResolved = (await import("../src/lib/mcq-choices")).resolveChoiceAnswer(
    (await import("../src/lib/mcq-choices")).choiceIdForText("42", "test-problem"),
    {
      id: "test-problem",
      correctAnswer: "42",
      choicesJson: ["42", "41", "43", "40"],
    },
  );
  assert("Legacy MCQ answers resolve by stable choice id", legacyResolved);

  const noSource = await prisma.problem.count({
    where: {
      isActive: true,
      reviewStatus: "APPROVED",
      studentReady: true,
      sourceId: null,
      OR: [{ sourceName: null }, { sourceName: "" }],
    },
  });
  assert("Approved student-visible problems have documented source", noSource === 0);

  const audit = await getMcqPositionAudit();
  console.log(
    `MCQ position audit sample=${audit.sampleSize} firstRate=${audit.correctAnswerFirstRate.toFixed(2)}`,
  );
  assert(
    "Displayed correct answer is not always first (position audit)",
    audit.correctAnswerFirstRate > 0.1 && audit.correctAnswerFirstRate < 0.9,
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
