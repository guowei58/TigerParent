import type { ProblemForValidation } from "./types";

export type AiCritique = {
  appropriateForGrade: boolean;
  answerCorrect: boolean;
  ambiguous: boolean;
  explanationCorrect: boolean;
  tooEasy: boolean;
  tooHard: boolean;
  testsIntendedConcept: boolean;
  distractorsUseful: boolean;
  requiresUntaughtKnowledge: boolean;
  wordingClearForChild: boolean;
  misconceptionRevealed: string;
  summary: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

/** Rule-based stand-in for AI critique until an LLM reviewer is wired in. */
export function runAiProblemCritique(problem: ProblemForValidation): AiCritique {
  const isEnglish = problem.skill.subject.slug === "english";
  const promptLen = problem.prompt.length;
  const hasExplanation = Boolean(problem.explanation?.trim());
  const hasChoices =
    problem.type === "MULTIPLE_CHOICE" &&
    Array.isArray(problem.choicesJson) &&
    (problem.choicesJson as unknown[]).length >= 3;

  const ambiguous =
    promptLen < 20 ||
    /\?\?/.test(problem.prompt) ||
    (hasChoices &&
      new Set(
        (problem.choicesJson as string[]).map((c) => c.trim().toLowerCase()),
      ).size < (problem.choicesJson as string[]).length);

  const tooEasy = problem.difficulty <= 2 && problem.gradeLevel >= 6;
  const tooHard = problem.difficulty >= 9 && problem.gradeLevel <= 4;

  return {
    appropriateForGrade:
      problem.gradeLevel >= problem.skill.nominalGradeLevel - 1 &&
      problem.gradeLevel <= problem.skill.nominalGradeLevel + 2,
    answerCorrect: Boolean(problem.correctAnswer.trim()),
    ambiguous,
    explanationCorrect: hasExplanation,
    tooEasy,
    tooHard,
    testsIntendedConcept: problem.tagsJson
      ? JSON.stringify(problem.tagsJson).includes(problem.skill.title) ||
        promptLen > 30
      : promptLen > 30,
    distractorsUseful: !isEnglish || hasChoices,
    requiresUntaughtKnowledge: false,
    wordingClearForChild: promptLen > 15 && !ambiguous,
    misconceptionRevealed:
      Array.isArray(problem.misconceptionTagsJson) &&
      (problem.misconceptionTagsJson as unknown[]).length > 0
        ? String((problem.misconceptionTagsJson as string[])[0])
        : "General procedural slip",
    summary: ambiguous
      ? "Potential ambiguity detected — human review recommended."
      : "Automated critique found no major issues; confirm with validation pipeline.",
    confidence: "MEDIUM",
  };
}
