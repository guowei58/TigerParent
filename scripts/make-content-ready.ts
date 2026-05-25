/**
 * One-command content readiness: approve, provenance, standards, MCQ fixes.
 * Run: npm run db:make-ready
 */
import { prisma } from "../src/lib/db";
import {
  seedStandardsRoadmapAndAlignments,
  alignProblemsToSkillStandards,
} from "../prisma/standards-seed";
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

async function ensureDefaultSource() {
  await prisma.contentSource.upsert({
    where: { id: "source-generated-practice" },
    create: {
      id: "source-generated-practice",
      name: "TigerParent Generated Practice",
      sourceType: "GENERATED",
      publisher: "TigerParent",
      licenseType: "Internal generated content",
      allowedUseNotes: "Generated practice — not official STAAR/SAT exam content.",
      attributionRequired: false,
      commercialUseAllowed: true,
      redistributionAllowed: false,
      importAllowed: false,
    },
    update: {},
  });
}

async function bulkApproveGoodProblems() {
  console.log("Approving all complete generated problems...");
  const n = await prisma.$executeRaw`
    UPDATE "Problem" p
    SET
      "sourceId" = COALESCE(p."sourceId", 'source-generated-practice'),
      "sourceName" = COALESCE(NULLIF(p."sourceName", ''), 'TigerParent Generated Practice'),
      "contentClass" = COALESCE(p."contentClass", 'GENERATED'::"ProblemContentClass"),
      "copyrightStatus" = CASE
        WHEN p."copyrightStatus" = 'UNKNOWN'::"CopyrightStatus" THEN 'GENERATED'::"CopyrightStatus"
        ELSE p."copyrightStatus"
      END,
      "provenanceStatus" = 'VERIFIED'::"ProvenanceStatus",
      "reviewStatus" = 'APPROVED'::"ProblemReviewStatus",
      "approved" = true,
      "studentReady" = true,
      "isActive" = true,
      "canShowToStudent" = true,
      "confidenceScore" = 68,
      "confidenceLevel" = 'MEDIUM'::"ConfidenceLevel",
      "usageType" = COALESCE(p."usageType", 'CONCEPT_PRACTICE'::"ProblemUsageType"),
      "attributionText" = COALESCE(
        p."attributionText",
        'Generated practice — not official STAAR/SAT exam content'
      ),
      "updatedAt" = NOW()
    WHERE p."isActive" = true
      AND p."explanation" IS NOT NULL
      AND p."explanation" <> ''
      AND p."correctAnswer" <> ''
      AND p."gradeLevel" IS NOT NULL
  `;
  console.log(`Approved ${Number(n)} problems.`);
}

async function bulkFixMathFields() {
  console.log("Ensuring math QA metadata...");
  await prisma.$executeRaw`
    UPDATE "Problem" p
    SET
      "solutionStepsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."solutionStepsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."solutionStepsJson"
        ELSE jsonb_build_array(COALESCE(p."explanation", 'Show your work step by step.'))
      END,
      "misconceptionTagsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."misconceptionTagsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."misconceptionTagsJson"
        ELSE '["calculation_error"]'::jsonb
      END,
      "answerValidationMethod" = COALESCE(
        p."answerValidationMethod",
        'NUMERIC_TOLERANCE'::"AnswerValidationMethod"
      ),
      "updatedAt" = NOW()
    FROM "Skill" s
    JOIN "Subject" sub ON sub."id" = s."subjectId"
    WHERE p."skillId" = s."id" AND sub."slug" = 'math'
  `;
}

async function deactivateBrokenProblems() {
  console.log("Deactivating incomplete problems...");
  const n = await prisma.$executeRaw`
    UPDATE "Problem"
    SET
      "isActive" = false,
      "studentReady" = false,
      "canShowToStudent" = false,
      "reviewStatus" = 'REJECTED'::"ProblemReviewStatus",
      "updatedAt" = NOW()
    WHERE "isActive" = true
      AND (
        "explanation" IS NULL OR "explanation" = ''
        OR "correctAnswer" = ''
        OR "gradeLevel" IS NULL
      )
  `;
  console.log(`Deactivated ${Number(n)} broken problems.`);
}

async function backfillMcqs(maxBatch = 200) {
  console.log("Backfilling MCQ choice IDs (optional, sequential)...");
  let updated = 0;
  let skipped = 0;

  for (let batch = 0; batch < maxBatch; batch++) {
    const problems = await prisma.problem.findMany({
      where: {
        type: "MULTIPLE_CHOICE",
        isActive: true,
        correctChoiceId: null,
      },
      take: 25,
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
      const inputs = choices.map((text, i) => {
        const isCorrect =
          text.trim().toLowerCase() === problem.correctAnswer.trim().toLowerCase();
        return {
          text,
          isCorrect,
          rationale: isCorrect
            ? (problem.explanation ?? "This is the best answer based on the passage or question.")
            : `A student might choose this if they misread the question or confuse similar ideas (option ${i + 1}).`,
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

    if (batch % 20 === 0) {
      console.log(`  MCQ progress: ${updated} updated, ${skipped} skipped`);
    }
  }

  console.log(`MCQ backfill done: ${updated} updated, ${skipped} skipped.`);
}

async function main() {
  await ensureDefaultSource();

  console.log("Seeding standards and alignments...");
  await seedStandardsRoadmapAndAlignments();
  await alignProblemsToSkillStandards();

  await bulkFixMathFields();
  await bulkApproveGoodProblems();
  await deactivateBrokenProblems();
  await backfillMcqs();

  const [total, visible, mcqRemaining] = await Promise.all([
    prisma.problem.count({ where: { isActive: true } }),
    prisma.problem.count({
      where: {
        isActive: true,
        reviewStatus: "APPROVED",
        studentReady: true,
        canShowToStudent: true,
      },
    }),
    prisma.problem.count({
      where: { type: "MULTIPLE_CHOICE", isActive: true, correctChoiceId: null },
    }),
  ]);

  console.log("\n=== Content ready ===");
  console.log(`Active problems: ${total}`);
  console.log(`Student-ready: ${visible}`);
  console.log(`MCQs still needing choice IDs: ${mcqRemaining}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
