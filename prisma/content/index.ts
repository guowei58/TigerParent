import { MATH_BUILDERS } from "./math-problems-g3-g4";
import { MATH_BUILDERS_G1_G2 } from "./math-problems-g1-g2";
import { MATH_BUILDERS_G5_G7 } from "./math-problems-g5-g7";
import { MATH_BUILDERS_G8_G12 } from "./math-problems-g8-g12";
import { MATH_EXTENDED_BUILDERS } from "./math-problems-extended";
import {
  ENGLISH_BUILDERS,
  g3Vocabulary,
  g4Inference,
  g5Vocabulary,
  g6Inference,
} from "./english-problems";
import { ENGLISH_BUILDERS_G1_G2 } from "./english-problems-g1-g2";
import { ENGLISH_BUILDERS_G8_G12 } from "./english-problems-g8-g12";
import { ENGLISH_EXTENDED_BUILDERS } from "./english-problems-extended";
import { hashSkillKey } from "./rng";
import type { ContentProblem } from "./types";
import {
  problemsCountForSkill,
  PROBLEMS_PER_SKILL,
  FLUENCY_PROBLEMS_PER_SKILL,
} from "./types";
import type { SkillDef } from "../curriculum-data";

export {
  PROBLEMS_PER_SKILL,
  FLUENCY_PROBLEMS_PER_SKILL,
  problemsCountForSkill,
  CONTENT_SOURCES,
} from "./types";
export { lessonContent } from "./lessons";

type Builder = (grade: number, count: number, seed: number) => ContentProblem[];

/** Legacy + extended builder registry with curriculum title aliases */
const MATH_ALIASES: Record<string, string> = {
  "Unit Rates": "Rates",
  "Percent of a Number": "Percentages",
  "Mean Median Mode": "Statistics Basics",
  "Decimal Addition & Subtraction": "Decimal Operations",
  "Decimal Multiplication": "Decimal Operations",
  "Decimal Division": "Decimal Operations",
  "Multiply Fractions": "Fraction Operations",
  "Divide Fractions": "Fraction Operations",
  "Add Fractions Unlike Denominators": "Add & Subtract Fractions",
  "Subtract Fractions Unlike Denominators": "Add & Subtract Fractions",
  "Angles & Lines": "Geometry Basics",
  "Inequalities Introduction": "Inequalities",
  "Two-Step Equations": "Multi-Step Equations",
  "Percent Applications": "Percentages",
  "Operations with Rational Numbers": "Negative Numbers",
  Circles: "Geometry",
  "Angles & Triangles": "Geometry",
  "Statistics & Sampling": "Statistics Basics",
  "Area of Triangles": "Geometry",
  "Coordinate Distance": "Coordinate Plane",
  "Data Displays": "Statistics Basics",
  "Evaluate Expressions": "Expressions",
  "Numerical Expressions": "Expressions",
  "Convert Measurements": "Measurement Conversions",
  "Graphing Patterns": "Coordinate Plane",
  "Pre-Algebra Mixed Review": "Pre-Algebra Fluency",
  Symmetry: "Geometry Basics",
  "Symmetry & Patterns": "Geometry Basics",
  "Place Value to 100": "Place Value",
  "Intro Multiplication": "Multiplication ×0, ×1, ×2, ×5",
};

const ENGLISH_ALIASES: Record<string, string> = {
  "Advanced Synthesis": "Synthesis",
};

const ALL_MATH_BUILDERS: Record<string, Builder> = {
  ...MATH_BUILDERS,
  ...MATH_BUILDERS_G1_G2,
  ...MATH_BUILDERS_G5_G7,
  ...MATH_BUILDERS_G8_G12,
  ...MATH_EXTENDED_BUILDERS,
};

for (const [alias, target] of Object.entries(MATH_ALIASES)) {
  if (!ALL_MATH_BUILDERS[alias] && ALL_MATH_BUILDERS[target]) {
    ALL_MATH_BUILDERS[alias] = ALL_MATH_BUILDERS[target];
  }
}

const ALL_ENGLISH_BUILDERS: Record<string, Builder> = {
  ...ENGLISH_BUILDERS,
  ...ENGLISH_BUILDERS_G1_G2,
  ...ENGLISH_BUILDERS_G8_G12,
  ...ENGLISH_EXTENDED_BUILDERS,
};

for (const [alias, target] of Object.entries(ENGLISH_ALIASES)) {
  if (!ALL_ENGLISH_BUILDERS[alias] && ALL_ENGLISH_BUILDERS[target]) {
    ALL_ENGLISH_BUILDERS[alias] = ALL_ENGLISH_BUILDERS[target];
  }
}

function resolveMathBuilder(skillTitle: string): Builder | undefined {
  return ALL_MATH_BUILDERS[skillTitle] ?? ALL_MATH_BUILDERS[MATH_ALIASES[skillTitle] ?? ""];
}

function resolveEnglishBuilder(skillTitle: string, grade: number): Builder | undefined {
  if (skillTitle === "Vocabulary in Context") {
    if (grade <= 2) return g3Vocabulary;
    return grade <= 4 ? g3Vocabulary : g5Vocabulary;
  }
  if (skillTitle === "Inference") {
    if (grade <= 2) return g4Inference;
    return grade <= 4 ? g4Inference : g6Inference;
  }
  return ALL_ENGLISH_BUILDERS[skillTitle] ?? ALL_ENGLISH_BUILDERS[ENGLISH_ALIASES[skillTitle] ?? ""];
}

export function buildProblemsForSkill(
  skillKey: string,
  subjectSlug: string,
  skillTitle: string,
  grade: number,
  count?: number,
  skillDef?: Pick<SkillDef, "fluency" | "minProblems">,
): ContentProblem[] {
  const seed = hashSkillKey(skillKey);
  const targetCount = count ?? (skillDef ? problemsCountForSkill(skillDef) : PROBLEMS_PER_SKILL);

  const builder =
    subjectSlug === "math"
      ? resolveMathBuilder(skillTitle)
      : resolveEnglishBuilder(skillTitle, grade);

  if (!builder) {
    console.warn(`No builder for ${subjectSlug}/${skillTitle} (grade ${grade})`);
    return [];
  }

  return builder(grade, targetCount, seed);
}

export function countMappedSkills(curriculum?: { title: string }[]) {
  if (curriculum) {
    const mapped = curriculum.filter((s) => resolveMathBuilder(s.title) || ALL_ENGLISH_BUILDERS[s.title]).length;
    return mapped;
  }
  return {
    math: Object.keys(ALL_MATH_BUILDERS).length,
    english: Object.keys(ALL_ENGLISH_BUILDERS).length,
  };
}

export function listUnmappedSkills(
  subjectSlug: string,
  skills: { title: string; grade: number }[],
) {
  return skills.filter((s) => {
    if (subjectSlug === "math") return !resolveMathBuilder(s.title);
    return !resolveEnglishBuilder(s.title, s.grade);
  });
}
