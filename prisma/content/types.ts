import type { ProblemType } from "../../src/generated/prisma/client";
import type { SkillDef } from "../curriculum-data";

export type ContentProblem = {
  type: ProblemType;
  prompt: string;
  choicesJson?: string[];
  choicesWithIdsJson?: unknown;
  correctChoiceId?: string;
  correctAnswer: string;
  acceptableAnswersJson?: string[];
  explanation: string;
  difficulty: number;
  gradeLevel: number;
  requiresScratchpad: boolean;
  mistakeCategoriesJson: string[];
  distractorRationaleJson?: Record<string, string>;
  sourceAttribution?: string;
  contentClass?: "OFFICIAL_RELEASED" | "LICENSED_OR_OER" | "GENERATED";
  usageType?: string;
};
export const PROBLEMS_PER_SKILL = 250;
export const FLUENCY_PROBLEMS_PER_SKILL = 400;

export function problemsCountForSkill(skill: Pick<SkillDef, "fluency" | "minProblems">): number {
  if (skill.fluency) return FLUENCY_PROBLEMS_PER_SKILL;
  return Math.max(PROBLEMS_PER_SKILL, skill.minProblems ?? PROBLEMS_PER_SKILL);
}

export const CONTENT_SOURCES = [
  "Common Core State Standards (CCSS) alignment for grades 1–12",
  "Kumon-style fluency progression: granular skills with high repetition",
  "Problem types modeled after EngageNY/Eureka Math (CC BY-NC-SA) — original items",
  "Problem types modeled after Illustrative Mathematics practice structures",
  "Reading passages and questions: original fiction/nonfiction for educational use",
  "NYSED released assessment item formats (structure only; original text)",
];
