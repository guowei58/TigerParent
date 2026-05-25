import { prisma } from "../src/lib/db";
import {
  MATH_CURRICULUM,
  ENGLISH_CURRICULUM,
  skillKey,
  countCurriculumSkills,
  allSkills,
} from "./curriculum-data";
import {
  buildProblemsForSkill,
  lessonContent,
  problemsCountForSkill,
  FLUENCY_PROBLEMS_PER_SKILL,
  PROBLEMS_PER_SKILL,
  listUnmappedSkills,
} from "./content";

const FORCE = process.argv.includes("--force");
const MAX_RETRIES = 5;

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES && /terminated|timeout|ECONNRESET|connection/i.test(msg)) {
        const wait = attempt * 3000;
        console.warn(`\n    ↻ ${label} failed (attempt ${attempt}), retry in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function upsertSkill(
  subjectSlug: string,
  subjectId: string,
  levelId: string,
  grade: number,
  skillDef: (typeof MATH_CURRICULUM)[0]["skills"][0],
  sequence: number,
) {
  const id = skillKey(subjectSlug, grade, skillDef.title);
  return withRetry(`upsert ${id}`, () =>
    prisma.skill.upsert({
      where: { id },
      update: {
        title: skillDef.title,
        description: skillDef.description,
        sequence,
        targetMedianSeconds: skillDef.targetMedianSeconds ?? 30,
        minProblemsForMastery: skillDef.minProblems ?? 60,
      },
      create: {
        id,
        subjectId,
        levelId,
        title: skillDef.title,
        description: skillDef.description,
        nominalGradeLevel: grade,
        prerequisiteSkillIdsJson: [],
        sequence,
        difficulty: Math.min(grade - 2, 5),
        targetAccuracy: skillDef.fluency ? 0.95 : 0.9,
        targetMedianSeconds: skillDef.targetMedianSeconds ?? 30,
        minProblemsForMastery: skillDef.minProblems ?? 60,
      },
    }),
  );
}

async function reseedSubject(
  subjectSlug: string,
  curriculum: typeof MATH_CURRICULUM,
) {
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { slug: subjectSlug },
  });

  let totalCreated = 0;
  let skipped = 0;

  for (const levelDef of curriculum) {
    const level = await prisma.level.findUnique({
      where: { id: `${subjectSlug}-level-${levelDef.grade}` },
    });
    if (!level) {
      console.warn(`Level missing: ${subjectSlug} grade ${levelDef.grade} — run npm run db:seed first`);
      continue;
    }

    for (let si = 0; si < levelDef.skills.length; si++) {
      const skillDef = levelDef.skills[si];
      const id = skillKey(subjectSlug, levelDef.grade, skillDef.title);
      const targetCount = problemsCountForSkill(skillDef);

      const skill = await upsertSkill(
        subjectSlug,
        subject.id,
        level.id,
        levelDef.grade,
        skillDef,
        si + 1,
      );

      const prevPrereqs: string[] = [];
      if (si > 0) {
        prevPrereqs.push(skillKey(subjectSlug, levelDef.grade, levelDef.skills[si - 1].title));
      }
      if (levelDef.grade > 3 && si === 0) {
        const prev = curriculum.find((l) => l.grade === levelDef.grade - 1);
        if (prev?.skills.length) {
          prevPrereqs.push(
            skillKey(subjectSlug, levelDef.grade - 1, prev.skills[prev.skills.length - 1].title),
          );
        }
      }
      await withRetry(`prereqs ${id}`, () =>
        prisma.skill.update({
          where: { id },
          data: { prerequisiteSkillIdsJson: [...new Set(prevPrereqs)] },
        }),
      );

      const existingCount = await withRetry(`count ${id}`, () =>
        prisma.problem.count({ where: { skillId: skill.id } }),
      );

      if (!FORCE && existingCount >= targetCount) {
        skipped++;
        console.log(`  ${skillDef.title} (G${levelDef.grade})... skip (${existingCount} already)`);
        continue;
      }

      process.stdout.write(`  ${skillDef.title} (G${levelDef.grade})... `);

      if (existingCount > 0) {
        await withRetry(`delete ${id}`, () =>
          prisma.problem.deleteMany({ where: { skillId: skill.id } }),
        );
      }

      const lesson = lessonContent(subjectSlug, skillDef.title, levelDef.grade);
      await withRetry(`lesson ${id}`, () =>
        prisma.lesson.upsert({
          where: { id: `${id}-lesson` },
          update: {
            title: lesson.title,
            content: lesson.content,
            workedExamplesJson: lesson.workedExamples,
            commonMistakesJson: lesson.commonMistakes,
            whyItMatters: lesson.whyItMatters,
          },
          create: {
            id: `${id}-lesson`,
            skillId: skill.id,
            title: lesson.title,
            content: lesson.content,
            workedExamplesJson: lesson.workedExamples,
            commonMistakesJson: lesson.commonMistakes,
            whyItMatters: lesson.whyItMatters,
          },
        }),
      );

      const problems = buildProblemsForSkill(
        id,
        subjectSlug,
        skillDef.title,
        levelDef.grade,
        targetCount,
        skillDef,
      );

      if (problems.length === 0) {
        console.warn(`⚠ no generator`);
        continue;
      }

      const batchSize = 100;
      for (let b = 0; b < problems.length; b += batchSize) {
        const chunk = problems.slice(b, b + batchSize);
        await withRetry(`insert ${id} batch ${b}`, () =>
          prisma.problem.createMany({
            data: chunk.map((p, pi) => ({
              id: `${id}-p${b + pi}`,
              skillId: skill.id,
              subjectId: subject.id,
              type: p.type,
              prompt: p.prompt,
              choicesJson: p.choicesJson ?? undefined,
              choicesWithIdsJson: p.choicesWithIdsJson ?? undefined,
              correctChoiceId: p.correctChoiceId ?? undefined,
              distractorRationaleJson: p.distractorRationaleJson ?? undefined,
              correctAnswer: p.correctAnswer,
              acceptableAnswersJson: p.acceptableAnswersJson ?? undefined,
              explanation: p.explanation,
              difficulty: p.difficulty,
              gradeLevel: p.gradeLevel,
              minGradeLevel: p.gradeLevel,
              maxGradeLevel: p.gradeLevel,
              targetSeconds: skillDef.targetMedianSeconds ?? 30,
              solutionStepsJson: p.explanation ? [p.explanation] : [],
              tagsJson: [skillDef.title],
              mistakeCategoriesJson: p.mistakeCategoriesJson,
              commonMistakeTagsJson: p.mistakeCategoriesJson,
              misconceptionTagsJson: p.mistakeCategoriesJson,
              requiresScratchpad: p.requiresScratchpad,
              sourceAttribution: p.sourceAttribution,
              sourceName: "TigerParent Generated Practice",
              sourceType: "SYSTEM_GENERATED",
              contentClass: "GENERATED",
              copyrightStatus: "GENERATED",
              provenanceStatus: "NEEDS_REVIEW",
              usageType: subjectSlug === "math" ? "FLUENCY_DRILL" : "CONCEPT_PRACTICE",
              canShowToStudent: false,
              canUseInCommercialProduct: false,
              attributionText: "Generated practice item — not official STAAR/SAT content",
              answerValidationMethod:
                subjectSlug === "math" ? "NUMERIC_TOLERANCE" : "EXACT",
              approved: false,
              reviewStatus: "NEEDS_REVIEW",
              studentReady: false,
              isActive: true,
            })),
          }),
        );
      }

      totalCreated += problems.length;
      const tag = skillDef.fluency ? "fluency" : "standard";
      console.log(`${problems.length} problems (${tag})`);
    }
  }

  if (skipped > 0) {
    console.log(`  (${skipped} skills skipped — already complete)`);
  }

  return totalCreated;
}

async function main() {
  const counts = countCurriculumSkills();
  console.log(`Reseeding ${counts.total} skills (${counts.math} math + ${counts.english} english)`);
  console.log(`Target: ${FLUENCY_PROBLEMS_PER_SKILL} fluency / ${PROBLEMS_PER_SKILL} standard problems per skill`);
  console.log(FORCE ? "Mode: FORCE (rebuild all)" : "Mode: RESUME (skip skills already at target count)");
  console.log("");

  const unmappedMath = listUnmappedSkills(
    "math",
    allSkills(MATH_CURRICULUM).map((s) => ({ title: s.title, grade: s.grade })),
  );
  const unmappedEnglish = listUnmappedSkills(
    "english",
    allSkills(ENGLISH_CURRICULUM).map((s) => ({ title: s.title, grade: s.grade })),
  );
  if (unmappedMath.length || unmappedEnglish.length) {
    console.warn("Unmapped skills (will get 0 problems):");
    for (const s of [...unmappedMath, ...unmappedEnglish]) {
      console.warn(`  - ${s.title} (G${s.grade})`);
    }
    console.log("");
  }

  const mathCount = await reseedSubject("math", MATH_CURRICULUM);
  const englishCount = await reseedSubject("english", ENGLISH_CURRICULUM);

  console.log("");
  console.log(`Done. Created ${mathCount + englishCount} problems this run.`);
  console.log(`  Math: ${mathCount}`);
  console.log(`  English: ${englishCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
