/**
 * Backfill existing problems with QA fields and run validation pipeline.
 * Run: npx tsx --env-file=.env scripts/content-backfill.ts [--full] [--limit=500]
 */
import { prisma } from "../src/lib/db";
import { runAndPersistProblemValidation } from "../src/lib/content-validation/pipeline";
import {
  seedStandardsRoadmapAndAlignments,
  alignProblemsToSkillStandards,
} from "../prisma/standards-seed";

const args = process.argv.slice(2);
const fullValidation = args.includes("--full");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

const FOUNDATION_SKILL_TITLES = new Set([
  "Multiplication ×0, ×1, ×2, ×5",
  "Multiplication Mixed 0–12",
  "Division Mixed",
  "Equivalent Fractions",
  "Decimal Addition & Subtraction",
  "Percent of a Number",
  "Ratios",
  "Integer Addition & Subtraction",
  "Multi-Step Equations",
  "Main Idea",
  "Inference",
  "Grammar",
]);

async function bulkBackfillProblemFields() {
  console.log("Bulk updating math problem QA fields...");
  await prisma.$executeRaw`
    UPDATE "Problem" p
    SET
      "subjectId" = s."subjectId",
      "targetSeconds" = COALESCE(NULLIF(p."targetSeconds", 0), s."targetMedianSeconds", 30),
      "minGradeLevel" = p."gradeLevel",
      "maxGradeLevel" = p."gradeLevel",
      "solutionStepsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."solutionStepsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."solutionStepsJson"
        WHEN p."explanation" IS NOT NULL AND p."explanation" <> ''
          THEN jsonb_build_array(p."explanation")
        ELSE '[]'::jsonb
      END,
      "commonMistakeTagsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."misconceptionTagsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."misconceptionTagsJson"
        WHEN jsonb_array_length(COALESCE(p."mistakeCategoriesJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."mistakeCategoriesJson"
        ELSE '["general_error"]'::jsonb
      END,
      "misconceptionTagsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."misconceptionTagsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."misconceptionTagsJson"
        WHEN jsonb_array_length(COALESCE(p."mistakeCategoriesJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."mistakeCategoriesJson"
        ELSE '["general_error"]'::jsonb
      END,
      "sourceType" = CASE WHEN p."aiGenerated" THEN 'AI_GENERATED'::"ProblemSourceType" ELSE 'SYSTEM_GENERATED'::"ProblemSourceType" END,
      "answerValidationMethod" = 'NUMERIC_TOLERANCE'::"AnswerValidationMethod",
      "reviewStatus" = CASE WHEN p."approved" THEN 'NEEDS_REVIEW'::"ProblemReviewStatus" ELSE 'DRAFT'::"ProblemReviewStatus" END,
      "studentReady" = false,
      "isActive" = true,
      "updatedAt" = NOW()
    FROM "Skill" s
    JOIN "Subject" sub ON sub."id" = s."subjectId"
    WHERE p."skillId" = s."id" AND sub."slug" = 'math'
  `;

  console.log("Bulk updating English problem QA fields...");
  await prisma.$executeRaw`
    UPDATE "Problem" p
    SET
      "subjectId" = s."subjectId",
      "targetSeconds" = COALESCE(NULLIF(p."targetSeconds", 0), s."targetMedianSeconds", 30),
      "minGradeLevel" = p."gradeLevel",
      "maxGradeLevel" = p."gradeLevel",
      "solutionStepsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."solutionStepsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."solutionStepsJson"
        WHEN p."explanation" IS NOT NULL AND p."explanation" <> ''
          THEN jsonb_build_array(p."explanation")
        ELSE '[]'::jsonb
      END,
      "commonMistakeTagsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."misconceptionTagsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."misconceptionTagsJson"
        WHEN jsonb_array_length(COALESCE(p."mistakeCategoriesJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."mistakeCategoriesJson"
        ELSE '["general_error"]'::jsonb
      END,
      "misconceptionTagsJson" = CASE
        WHEN jsonb_array_length(COALESCE(p."misconceptionTagsJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."misconceptionTagsJson"
        WHEN jsonb_array_length(COALESCE(p."mistakeCategoriesJson"::jsonb, '[]'::jsonb)) > 0
          THEN p."mistakeCategoriesJson"
        ELSE '["general_error"]'::jsonb
      END,
      "sourceType" = CASE WHEN p."aiGenerated" THEN 'AI_GENERATED'::"ProblemSourceType" ELSE 'SYSTEM_GENERATED'::"ProblemSourceType" END,
      "answerValidationMethod" = 'EXACT'::"AnswerValidationMethod",
      "reviewStatus" = CASE WHEN p."approved" THEN 'NEEDS_REVIEW'::"ProblemReviewStatus" ELSE 'DRAFT'::"ProblemReviewStatus" END,
      "studentReady" = false,
      "isActive" = true,
      "updatedAt" = NOW()
    FROM "Skill" s
    JOIN "Subject" sub ON sub."id" = s."subjectId"
    WHERE p."skillId" = s."id" AND sub."slug" = 'english'
  `;
}

async function main() {
  console.log("Seeding standards, roadmap, and alignments...");
  await seedStandardsRoadmapAndAlignments();

  console.log("Bulk backfilling problem QA metadata...");
  await bulkBackfillProblemFields();

  const foundationSkills = await prisma.skill.findMany({
    where: { title: { in: [...FOUNDATION_SKILL_TITLES] } },
    select: { id: true, title: true },
  });
  for (const skill of foundationSkills) {
    await prisma.skill.update({
      where: { id: skill.id },
      data: {
        isFoundationSkill: true,
        isFluencySkill: skill.title.toLowerCase().includes("fact") || skill.title.includes("Mixed"),
      },
    });
  }

  console.log("Aligning problems to skill standards...");
  await alignProblemsToSkillStandards();

  if (!fullValidation) {
    const legacyApproved = await prisma.problem.updateMany({
      where: {
        approved: true,
        explanation: { not: null },
        NOT: [{ explanation: "" }],
      },
      data: {
        reviewStatus: "APPROVED",
        studentReady: true,
        approved: true,
        isActive: true,
        provenanceStatus: "VERIFIED",
        copyrightStatus: "GENERATED",
        contentClass: "GENERATED",
        canShowToStudent: true,
        sourceName: "TigerParent Generated Practice",
      },
    });
    console.log(
      `Fast-path approved ${legacyApproved.count} legacy problems with explanations.`,
    );
  }

  if (fullValidation || limit) {
    const toValidate = await prisma.problem.findMany({
      select: { id: true },
      ...(limit ? { take: limit } : {}),
      ...(fullValidation ? {} : { where: { approved: false } }),
    });

    const batchSize = 50;
    for (let i = 0; i < toValidate.length; i += batchSize) {
      const chunk = toValidate.slice(i, i + batchSize);
      for (const p of chunk) {
        try {
          await runAndPersistProblemValidation(p.id);
        } catch (err) {
          console.warn(`Validation failed for ${p.id}:`, err);
        }
      }
      console.log(
        `Validated ${Math.min(i + batchSize, toValidate.length)}/${toValidate.length}`,
      );
    }
  }

  const approved = await prisma.problem.count({
    where: { reviewStatus: "APPROVED", studentReady: true },
  });
  console.log(`Done. ${approved} problems student-ready.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
