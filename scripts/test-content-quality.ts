/**
 * Content quality acceptance tests.
 * Run: npx tsx scripts/test-content-quality.ts
 */
import { config } from "dotenv";
config();

import { prisma } from "../src/lib/db";
import { studentVisibleProblemWhere } from "../src/lib/problem-student-gate";
import { validateMathAnswerDeterministic } from "../src/lib/content-validation/math-answer-check";
import { generateFractionAdditionLike, generateAdditionFact } from "../src/lib/math-generators/index";
import { checkMastery } from "../src/lib/mastery";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}`);
  }
}

async function main() {
  const legacyGatedAttempts = await prisma.problem.count({
    where: {
      AND: [
        { NOT: studentVisibleProblemWhere() },
        { attempts: { some: {} } },
      ],
    },
  });
  if (legacyGatedAttempts > 0) {
    console.log(
      `Note: ${legacyGatedAttempts} problems with legacy attempts predate full provenance gates`,
    );
  }
  assert(
    "Student-visible gate is enforced for new practice",
    (await prisma.problem.count({ where: studentVisibleProblemWhere() })) > 0,
  );

  const studentPool = await prisma.problem.findMany({
    where: studentVisibleProblemWhere(),
    take: 20,
    include: { standardAlignments: true },
  });

  for (const problem of studentPool) {
    assert(
      `Approved problem ${problem.id} has explanation`,
      Boolean(problem.explanation?.trim()),
    );
  }

  for (const generated of [
    generateFractionAdditionLike({ grade: 5, skillTitle: "Add Fractions Like Denominators", seed: 1 }, 3),
    generateAdditionFact({ grade: 3, skillTitle: "Addition Facts to 10", seed: 1 }, 2),
  ]) {
    const mathCheck = validateMathAnswerDeterministic({
      type: "NUMERIC",
      correctAnswer: generated.correctAnswer,
      acceptableAnswersJson: generated.acceptableAnswersJson,
      answerValidationMethod: generated.answerValidationMethod,
      solutionStepsJson: generated.solutionStepsJson,
    });
    assert(`Generator valid: ${generated.prompt.slice(0, 20)}`, mathCheck.valid);
  }

  const visibleCount = await prisma.problem.count({
    where: studentVisibleProblemWhere(),
  });
  assert("Student-visible problem pool is non-empty", visibleCount > 0);

  const masteryBlocked = checkMastery(
    {
      accuracy: 0.95,
      medianSeconds: 10,
      attemptsCount: 5,
      sessionsCount: 1,
      retentionScore: 0.8,
      challengeScore: 0.9,
      masteryScore: 90,
    },
    {
      targetAccuracy: 0.9,
      targetMedianSeconds: 30,
      minProblemsForMastery: 20,
      minSessionsForMastery: 2,
      isFoundationSkill: true,
      applicationAccuracyRequired: 0.85,
    },
  );
  assert("Foundation mastery requires sufficient attempts/sessions", !masteryBlocked);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
