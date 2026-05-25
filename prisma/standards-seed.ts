/**
 * Seed curriculum standards (TEKS default, Common Core, SAT domains),
 * skill alignments, roadmap nodes, prerequisites, and SAT foundation maps.
 */
import { config } from "dotenv";
config();

import {
  MATH_CURRICULUM,
  ENGLISH_CURRICULUM,
  allSkills,
  skillKey,
} from "./curriculum-data";
import { prisma } from "../src/lib/db";

type StandardSeed = {
  framework: "TEKS" | "COMMON_CORE" | "SAT";
  subjectSlug: string;
  gradeLevel: number;
  standardCode: string;
  title: string;
  description: string;
  domain: string;
  strand?: string;
};

const TEKS_MATH: StandardSeed[] = [
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 3, standardCode: "3.4A", title: "Addition and subtraction fluency", description: "Recall facts to 20", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 3, standardCode: "3.4E", title: "Multiplication and division facts", description: "Represent and solve using arrays and facts", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 4, standardCode: "4.4A", title: "Multi-digit multiplication", description: "Multiply up to four digits by one digit", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 4, standardCode: "4.4F", title: "Long division", description: "Divide up to four digits by one digit", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 4, standardCode: "4.3E", title: "Fraction operations", description: "Add and subtract fractions with like denominators", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 5, standardCode: "5.3K", title: "Decimal operations", description: "Add, subtract, multiply, divide decimals", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 6, standardCode: "6.4B", title: "Ratios and rates", description: "Apply ratios and unit rates", domain: "Proportionality" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 6, standardCode: "6.3D", title: "Integer operations", description: "Add, subtract, multiply, divide integers", domain: "Number and Operations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 7, standardCode: "7.11A", title: "Linear equations", description: "Model and solve one-variable equations", domain: "Expressions and Equations" },
  { framework: "TEKS", subjectSlug: "math", gradeLevel: 5, standardCode: "5.4H", title: "Volume", description: "Volume of rectangular prisms", domain: "Geometry" },
];

const CC_MATH: StandardSeed[] = [
  { framework: "COMMON_CORE", subjectSlug: "math", gradeLevel: 3, standardCode: "3.OA.C.7", title: "Fluently multiply and divide", description: "Facts within 100", domain: "Operations and Algebraic Thinking" },
  { framework: "COMMON_CORE", subjectSlug: "math", gradeLevel: 4, standardCode: "4.NF.B.3", title: "Fraction addition/subtraction", description: "Like denominators", domain: "Number and Operations—Fractions" },
  { framework: "COMMON_CORE", subjectSlug: "math", gradeLevel: 6, standardCode: "6.RP.A.1", title: "Understand ratio concepts", description: "Ratio language and notation", domain: "Ratios and Proportional Relationships" },
];

const SAT_MATH: StandardSeed[] = [
  { framework: "SAT", subjectSlug: "math", gradeLevel: 8, standardCode: "SAT-M-ALG", title: "Algebra", description: "Linear equations, systems, functions", domain: "Algebra" },
  { framework: "SAT", subjectSlug: "math", gradeLevel: 8, standardCode: "SAT-M-ADV", title: "Advanced Math", description: "Quadratics, polynomials, radicals", domain: "Advanced Math" },
  { framework: "SAT", subjectSlug: "math", gradeLevel: 7, standardCode: "SAT-M-PSDA", title: "Problem-Solving and Data Analysis", description: "Ratios, rates, percentages, data", domain: "Problem-Solving and Data Analysis" },
  { framework: "SAT", subjectSlug: "math", gradeLevel: 7, standardCode: "SAT-M-GEO", title: "Geometry and Trigonometry", description: "Area, volume, angles, right triangles", domain: "Geometry and Trigonometry" },
];

const TEKS_ELA: StandardSeed[] = [
  { framework: "TEKS", subjectSlug: "english", gradeLevel: 3, standardCode: "3.6A", title: "Main idea", description: "Establish purpose and summarize", domain: "Reading" },
  { framework: "TEKS", subjectSlug: "english", gradeLevel: 4, standardCode: "4.6F", title: "Inference", description: "Make inferences and support with text", domain: "Reading" },
  { framework: "TEKS", subjectSlug: "english", gradeLevel: 5, standardCode: "5.11A", title: "Grammar and conventions", description: "Edit for grammar and usage", domain: "Writing" },
];

const SAT_ELA: StandardSeed[] = [
  { framework: "SAT", subjectSlug: "english", gradeLevel: 8, standardCode: "SAT-RW-INFO", title: "Information and Ideas", description: "Central ideas, details, inferences", domain: "Information and Ideas" },
  { framework: "SAT", subjectSlug: "english", gradeLevel: 8, standardCode: "SAT-RW-CRAFT", title: "Craft and Structure", description: "Word choice, text structure, purpose", domain: "Craft and Structure" },
  { framework: "SAT", subjectSlug: "english", gradeLevel: 8, standardCode: "SAT-RW-EXPR", title: "Expression of Ideas", description: "Transitions, concision, development", domain: "Expression of Ideas" },
  { framework: "SAT", subjectSlug: "english", gradeLevel: 8, standardCode: "SAT-RW-SEC", title: "Standard English Conventions", description: "Grammar, punctuation, sentence form", domain: "Standard English Conventions" },
];

const ALL_STANDARDS = [...TEKS_MATH, ...CC_MATH, ...SAT_MATH, ...TEKS_ELA, ...SAT_ELA];

const SKILL_STANDARD_PATTERNS: Array<{ match: RegExp; codes: string[] }> = [
  { match: /addition fact/i, codes: ["3.4A", "3.OA.C.7"] },
  { match: /subtraction fact/i, codes: ["3.4A"] },
  { match: /multiplication|division/i, codes: ["3.4E", "3.OA.C.7", "SAT-M-PSDA"] },
  { match: /fraction/i, codes: ["4.3E", "4.NF.B.3", "SAT-M-PSDA"] },
  { match: /decimal/i, codes: ["5.3K", "SAT-M-PSDA"] },
  { match: /percent/i, codes: ["SAT-M-PSDA", "6.4B"] },
  { match: /ratio|rate/i, codes: ["6.4B", "6.RP.A.1", "SAT-M-PSDA"] },
  { match: /integer|rational/i, codes: ["6.3D", "SAT-M-ALG"] },
  { match: /equation|inequalit/i, codes: ["7.11A", "SAT-M-ALG"] },
  { match: /area|perimeter|volume|geometry|circle|angle|triangle/i, codes: ["5.4H", "SAT-M-GEO"] },
  { match: /main idea|supporting detail|comprehension|summar/i, codes: ["3.6A", "SAT-RW-INFO"] },
  { match: /inference|evidence|argument|claim/i, codes: ["4.6F", "SAT-RW-INFO", "SAT-RW-CRAFT"] },
  { match: /grammar|punctuation|convention|sentence correction|capitalization|comma|verb tense|pronoun/i, codes: ["5.11A", "SAT-RW-SEC"] },
  { match: /vocabulary|prefix|suffix|connotation/i, codes: ["SAT-RW-CRAFT"] },
  { match: /theme|structure|transition|writing|essay|thesis|rhetorical/i, codes: ["SAT-RW-EXPR", "SAT-RW-CRAFT"] },
];

const SAT_SKILL_MAP: Array<{ match: RegExp; domain: string; importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }> = [
  { match: /multiplication|division fact/i, domain: "Problem-Solving and Data Analysis", importance: "CRITICAL" },
  { match: /fraction|decimal|percent|ratio|rate/i, domain: "Problem-Solving and Data Analysis", importance: "CRITICAL" },
  { match: /integer|expression|equation/i, domain: "Algebra", importance: "HIGH" },
  { match: /area|perimeter|volume|geometry|circle|angle|triangle|coordinate/i, domain: "Geometry and Trigonometry", importance: "HIGH" },
  { match: /main idea|inference|evidence|vocabulary|comprehension/i, domain: "Information and Ideas", importance: "CRITICAL" },
  { match: /theme|structure|author|figurative|rhetorical|point of view/i, domain: "Craft and Structure", importance: "HIGH" },
  { match: /grammar|punctuation|convention|sentence|comma|verb|pronoun|capitalization/i, domain: "Standard English Conventions", importance: "CRITICAL" },
  { match: /writing|essay|thesis|transition|editing|revising|paragraph/i, domain: "Expression of Ideas", importance: "MEDIUM" },
];

const FOUNDATION_TITLES = new Set([
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

function codesForSkill(title: string, subjectSlug: string): string[] {
  const codes = new Set<string>();
  for (const pattern of SKILL_STANDARD_PATTERNS) {
    if (pattern.match.test(title)) {
      for (const code of pattern.codes) codes.add(code);
    }
  }
  if (codes.size === 0) {
    codes.add(subjectSlug === "math" ? "3.4A" : "3.6A");
  }
  return [...codes];
}

export async function alignProblemsToSkillStandards() {
  await prisma.$executeRaw`
    INSERT INTO "ProblemStandardAlignment" ("id", "problemId", "standardId", "alignmentStrength", "notes")
    SELECT
      md5(p."id" || sa."standardId") AS id,
      p."id",
      sa."standardId",
      'PRIMARY'::"AlignmentStrength",
      NULL
    FROM "Problem" p
    JOIN "SkillStandardAlignment" sa ON sa."skillId" = p."skillId"
    WHERE sa."alignmentStrength" = 'PRIMARY'
    ON CONFLICT ("problemId", "standardId") DO UPDATE
      SET "alignmentStrength" = 'PRIMARY'::"AlignmentStrength"
  `;

  const count = await prisma.problemStandardAlignment.count();
  return count;
}

export async function seedStandardsRoadmapAndAlignments() {
  const subjects = await prisma.subject.findMany();
  const subjectBySlug = new Map(subjects.map((s) => [s.slug, s]));

  const standardRecords = new Map<string, string>();

  for (const seed of ALL_STANDARDS) {
    const subject = subjectBySlug.get(seed.subjectSlug);
    const row = await prisma.curriculumStandard.upsert({
      where: {
        framework_standardCode: {
          framework: seed.framework,
          standardCode: seed.standardCode,
        },
      },
      create: {
        framework: seed.framework,
        subjectSlug: seed.subjectSlug,
        subjectId: subject?.id,
        gradeLevel: seed.gradeLevel,
        standardCode: seed.standardCode,
        title: seed.title,
        description: seed.description,
        domain: seed.domain,
        strand: seed.strand,
        active: true,
      },
      update: {
        title: seed.title,
        description: seed.description,
        domain: seed.domain,
        active: true,
      },
    });
    standardRecords.set(`${seed.framework}:${seed.standardCode}`, row.id);
  }

  const skills = await prisma.skill.findMany({ include: { subject: true } });

  for (const skill of skills) {
    const codes = codesForSkill(skill.title, skill.subject.slug);
    let primarySet = false;

    for (const code of codes) {
      const standardId =
        standardRecords.get(`TEKS:${code}`) ??
        standardRecords.get(`COMMON_CORE:${code}`) ??
        standardRecords.get(`SAT:${code}`);
      if (!standardId) continue;

      await prisma.skillStandardAlignment.upsert({
        where: { skillId_standardId: { skillId: skill.id, standardId } },
        create: {
          skillId: skill.id,
          standardId,
          alignmentStrength: primarySet ? "SECONDARY" : "PRIMARY",
        },
        update: {},
      });
      primarySet = true;
    }

    await prisma.skillRoadmapNode.upsert({
      where: { subjectId_skillId: { subjectId: skill.subjectId, skillId: skill.id } },
      create: {
        subjectId: skill.subjectId,
        skillId: skill.id,
        gradeLevel: skill.nominalGradeLevel,
        sequence: skill.sequence,
        roadmapStage: "ON_GRADE",
        isCoreSkill: true,
        isRemediationSkill: false,
        isAdvancedSkill: false,
        satFoundationImportance: FOUNDATION_TITLES.has(skill.title) ? "HIGH" : "NONE",
      },
      update: {
        gradeLevel: skill.nominalGradeLevel,
        sequence: skill.sequence,
      },
    });

    await prisma.skill.update({
      where: { id: skill.id },
      data: {
        isFoundationSkill: FOUNDATION_TITLES.has(skill.title),
        isFluencySkill: skill.title.toLowerCase().includes("fact") || skill.title.includes("Mixed"),
        satFoundationImportance: FOUNDATION_TITLES.has(skill.title) ? "HIGH" : "NONE",
      },
    });

    for (const sat of SAT_SKILL_MAP) {
      if (!sat.match.test(skill.title)) continue;
      await prisma.sATReadinessSkillMap.upsert({
        where: { skillId_satDomain: { skillId: skill.id, satDomain: sat.domain } },
        create: {
          skillId: skill.id,
          satDomain: sat.domain,
          satImportance: sat.importance,
          expectedMasteryGrade: skill.nominalGradeLevel + 1,
          notes: "Auto-mapped SAT foundation skill",
        },
        update: { satImportance: sat.importance },
      });
    }
  }

  for (const curriculum of [MATH_CURRICULUM, ENGLISH_CURRICULUM]) {
    const subjectSlug = curriculum === MATH_CURRICULUM ? "math" : "english";
    for (const levelDef of curriculum) {
      for (let si = 0; si < levelDef.skills.length; si++) {
        const skillId = skillKey(subjectSlug, levelDef.grade, levelDef.skills[si]!.title);
        const skill = skills.find((s) => s.id === skillId);
        if (!skill) continue;

        const prereqIds: string[] = [];
        if (si > 0) {
          prereqIds.push(
            skillKey(subjectSlug, levelDef.grade, levelDef.skills[si - 1]!.title),
          );
        }
        if (levelDef.grade > 3 && si === 0) {
          const prev = curriculum.find((l) => l.grade === levelDef.grade - 1);
          if (prev?.skills.length) {
            prereqIds.push(
              skillKey(
                subjectSlug,
                levelDef.grade - 1,
                prev.skills[prev.skills.length - 1]!.title,
              ),
            );
          }
        }

        for (const prereqId of [...new Set(prereqIds)]) {
          const prereq = skills.find((s) => s.id === prereqId);
          if (!prereq) continue;
          await prisma.prerequisiteSkill.upsert({
            where: {
              skillId_prerequisiteSkillId: {
                skillId: skill.id,
                prerequisiteSkillId: prereq.id,
              },
            },
            create: {
              skillId: skill.id,
              prerequisiteSkillId: prereq.id,
              requiredMasteryScore: 85,
              importance: "REQUIRED",
            },
            update: {},
          });
        }
      }
    }
  }

  const problems = await prisma.problem.findMany({
    include: { skill: { include: { standardAlignments: true } } },
  });

  await alignProblemsToSkillStandards();

  return {
    standards: ALL_STANDARDS.length,
    skills: skills.length,
    problemsAligned: problems.length,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  seedStandardsRoadmapAndAlignments()
    .then((result) => {
      console.log("Standards seed complete:", result);
    })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
