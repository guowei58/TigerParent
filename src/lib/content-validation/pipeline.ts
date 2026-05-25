import { prisma } from "@/lib/db";
import { runAiProblemCritique } from "./ai-critic";
import { validateMathAnswerDeterministic } from "./math-answer-check";
import { computeProblemConfidence } from "@/lib/content-provenance/confidence";
import { importedProblemApprovalRequirements } from "@/lib/content-provenance/gate";
import { isGenericDistractor } from "@/lib/mcq-choices";
import type { PipelineResult, ProblemForValidation, ValidationResult } from "./types";

function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  return [];
}

function isMathSubject(slug: string) {
  return slug === "math";
}

function isEnglishSubject(slug: string) {
  return slug === "english";
}

export function validateProvenance(problem: ProblemForValidation): ValidationResult {
  const missing = importedProblemApprovalRequirements({
    contentClass: problem.contentClass ?? "GENERATED",
    correctAnswer: problem.correctAnswer,
    explanation: problem.explanation,
    gradeLevel: problem.gradeLevel,
    sourceId: problem.sourceId,
    sourceName: problem.sourceName,
    standardAlignmentsCount: problem.standardAlignments.length,
  });

  if (problem.copyrightStatus === "UNKNOWN") {
    missing.push("copyright status");
  }

  const pass = missing.length === 0 && problem.provenanceStatus !== "REJECTED";
  return {
    validationType: "PROVENANCE",
    status: pass ? "PASS" : "FAIL",
    details: { missing, provenanceStatus: problem.provenanceStatus },
    message: pass
      ? "Provenance and rights documented"
      : `Provenance incomplete: ${missing.join(", ")}`,
  };
}
export function validateSchema(problem: ProblemForValidation): ValidationResult {
  const missing: string[] = [];
  if (!problem.prompt.trim()) missing.push("prompt");
  if (!problem.correctAnswer.trim()) missing.push("correctAnswer");
  if (!problem.explanation?.trim()) missing.push("explanation");
  if (!problem.gradeLevel && problem.gradeLevel !== 0) missing.push("gradeLevel");
  if (!problem.difficulty) missing.push("difficulty");
  if (!problem.targetSeconds) missing.push("targetSeconds");
  if (!problem.skillId) missing.push("skillId");

  const solutionSteps = parseJsonArray(problem.solutionStepsJson);
  if (isMathSubject(problem.skill.subject.slug) && solutionSteps.length === 0) {
    missing.push("solutionStepsJson");
  }

  const mistakes = parseJsonArray(problem.misconceptionTagsJson);
  if (mistakes.length === 0 && parseJsonArray(problem.commonMistakeTagsJson).length === 0) {
    missing.push("misconceptionTagsJson");
  }

  const status = missing.length === 0 ? "PASS" : "FAIL";
  return {
    validationType: "SCHEMA",
    status,
    details: { missing },
    message:
      missing.length === 0
        ? "All required fields present"
        : `Missing required fields: ${missing.join(", ")}`,
  };
}

export function validateStandardsAlignment(
  problem: ProblemForValidation,
): ValidationResult {
  const hasPrimary = problem.standardAlignments.some(
    (a) => a.alignmentStrength === "PRIMARY",
  );

  return {
    validationType: "GRADE_LEVEL",
    status: hasPrimary ? "PASS" : "FAIL",
    details: { alignmentCount: problem.standardAlignments.length },
    message: hasPrimary
      ? "Primary standard alignment recorded"
      : "Missing primary standard alignment — required before student use",
  };
}

export function validateAnswer(problem: ProblemForValidation): ValidationResult {
  if (isMathSubject(problem.skill.subject.slug)) {
    const result = validateMathAnswerDeterministic(problem);
    return {
      validationType: "ANSWER",
      status: result.valid ? "PASS" : "FAIL",
      details: {},
      message: result.message,
    };
  }

  if (isEnglishSubject(problem.skill.subject.slug)) {
    const hasPassage = problem.prompt.includes("Read the passage");
    const hasAnswer = problem.correctAnswer.trim().length > 0;
    const mcValid =
      problem.type !== "MULTIPLE_CHOICE" ||
      (Array.isArray(problem.choicesJson) &&
        (problem.choicesJson as unknown[]).length >= 3);

    const valid = hasAnswer && mcValid && (!hasPassage || problem.explanation?.trim());
    return {
      validationType: "ANSWER",
      status: valid ? "PASS" : "FAIL",
      details: { hasPassage, mcValid },
      message: valid
        ? "English answer structure valid"
        : "English problem missing answer, choices, or passage support",
    };
  }

  return {
    validationType: "ANSWER",
    status: problem.correctAnswer.trim() ? "PASS" : "FAIL",
    details: {},
    message: problem.correctAnswer.trim() ? "Answer present" : "Missing answer",
  };
}

export function validateExplanation(problem: ProblemForValidation): ValidationResult {
  const explanation = problem.explanation?.trim() ?? "";
  const minLen = isEnglishSubject(problem.skill.subject.slug) ? 20 : 10;
  const pass = explanation.length >= minLen;
  return {
    validationType: "EXPLANATION",
    status: pass ? "PASS" : "FAIL",
    details: { length: explanation.length },
    message: pass ? "Explanation meets minimum length" : "Explanation too short or missing",
  };
}

export function validateAmbiguity(problem: ProblemForValidation): ValidationResult {
  const critique = runAiProblemCritique(problem);
  return {
    validationType: "AMBIGUITY",
    status: critique.ambiguous ? "FAIL" : "PASS",
    details: { critique },
    message: critique.ambiguous
      ? "Potential ambiguity detected"
      : "No major ambiguity detected",
  };
}

export function validateDistractors(problem: ProblemForValidation): ValidationResult {
  if (problem.type !== "MULTIPLE_CHOICE") {
    return {
      validationType: "DISTRACTOR",
      status: "PASS",
      details: {},
      message: "Not multiple choice",
    };
  }

  const choices = (problem.choicesJson as string[] | null) ?? [];
  if (choices.length < 3) {
    return {
      validationType: "DISTRACTOR",
      status: "FAIL",
      details: { count: choices.length },
      message: "Multiple choice needs at least 3 options",
    };
  }

  const normalized = choices.map((c) => c.trim().toLowerCase());
  const unique = new Set(normalized);
  const absurd = choices.some((c) => c.trim().length < 2);
  const genericCount = choices.filter((c) => isGenericDistractor(c)).length;
  const rationales =
    problem.distractorRationaleJson &&
    typeof problem.distractorRationaleJson === "object"
      ? Object.keys(problem.distractorRationaleJson as object).length
      : 0;
  const requiredRationales = Math.max(choices.length - 1, 0);

  const pass =
    unique.size === choices.length &&
    !absurd &&
    genericCount === 0 &&
    rationales >= requiredRationales;

  return {
    validationType: "DISTRACTOR",
    status: pass ? "PASS" : "FAIL",
    details: { choices, genericCount, rationales, requiredRationales },
    message: pass
      ? "Distractors and rationales look usable"
      : genericCount > 0
        ? "Generic distractors detected"
        : rationales < requiredRationales
          ? "Missing distractor rationales"
          : "Distractor quality needs review",
  };
}

export function validateSafety(problem: ProblemForValidation): ValidationResult {
  const blocked = /\b(explicit|porn|violent attack)\b/i.test(problem.prompt);
  return {
    validationType: "SAFETY",
    status: blocked ? "FAIL" : "PASS",
    details: {},
    message: blocked ? "Content failed safety screen" : "Content passes basic safety screen",
  };
}

export function validateDifficulty(problem: ProblemForValidation): ValidationResult {
  const gradeDelta = Math.abs(problem.gradeLevel - problem.skill.nominalGradeLevel);
  const timeRatio = problem.targetSeconds / Math.max(problem.difficulty * 5, 1);
  const pass = gradeDelta <= 2 && problem.difficulty >= 1 && problem.difficulty <= 10;
  return {
    validationType: "DIFFICULTY",
    status: pass ? "PASS" : "WARNING",
    details: { gradeDelta, timeRatio },
    message: pass
      ? "Difficulty and grade level are plausible"
      : "Difficulty/grade mismatch — review recommended",
  };
}

export async function validateDuplicate(
  problem: ProblemForValidation,
): Promise<ValidationResult> {
  const near = await prisma.problem.findFirst({
    where: {
      id: { not: problem.id },
      skillId: problem.skillId,
      isActive: true,
      prompt: problem.prompt,
    },
    select: { id: true },
  });

  return {
    validationType: "DUPLICATE",
    status: near ? "FAIL" : "PASS",
    details: { duplicateId: near?.id ?? null },
    message: near ? "Exact duplicate prompt found" : "No exact duplicate",
  };
}

export function runAiCritiqueValidation(problem: ProblemForValidation): ValidationResult {
  const critique = runAiProblemCritique(problem);
  const fail =
    critique.ambiguous ||
    !critique.answerCorrect ||
    !critique.explanationCorrect ||
    critique.requiresUntaughtKnowledge;

  return {
    validationType: "AI_CRITIQUE",
    status: fail ? "WARNING" : "PASS",
    details: { critique },
    message: critique.summary,
  };
}

export function evaluatePipeline(results: ValidationResult[]): PipelineResult {
  const hasFail = results.some((r) => r.status === "FAIL");
  const schemaPass = results.find((r) => r.validationType === "SCHEMA")?.status === "PASS";
  const answerPass = results.find((r) => r.validationType === "ANSWER")?.status === "PASS";
  const explanationPass =
    results.find((r) => r.validationType === "EXPLANATION")?.status === "PASS";
  const provenancePass =
    results.find((r) => r.validationType === "PROVENANCE")?.status === "PASS";
  const distractorPass =
    results.find((r) => r.validationType === "DISTRACTOR")?.status !== "FAIL";

  const canShowToStudents =
    !hasFail && schemaPass && answerPass && explanationPass && provenancePass && distractorPass;

  return {
    problemId: "",
    results,
    passed: canShowToStudents,
    canShowToStudents,
    recommendedStatus: hasFail
      ? "REJECTED"
      : canShowToStudents
        ? "APPROVED"
        : "NEEDS_REVIEW",
  };
}

export async function runProblemValidationPipeline(
  problem: ProblemForValidation,
): Promise<PipelineResult> {
  const results: ValidationResult[] = [
    validateSchema(problem),
    validateProvenance(problem),
    validateStandardsAlignment(problem),
    validateAnswer(problem),
    validateExplanation(problem),
    validateDifficulty(problem),
    validateAmbiguity(problem),
    validateDistractors(problem),
    validateSafety(problem),
    await validateDuplicate(problem),
    runAiCritiqueValidation(problem),
  ];

  const evaluation = evaluatePipeline(results);
  evaluation.problemId = problem.id;
  return evaluation;
}

export async function runAndPersistProblemValidation(problemId: string) {
  const problem = await prisma.problem.findUniqueOrThrow({
    where: { id: problemId },
    include: {
      skill: { include: { subject: true } },
      standardAlignments: true,
    },
  });

  const pipeline = await runProblemValidationPipeline(problem as ProblemForValidation);

  const confidence = computeProblemConfidence({
    contentClass: problem.contentClass ?? "GENERATED",
    provenanceStatus:
      pipeline.canShowToStudents && pipeline.recommendedStatus === "APPROVED"
        ? "VERIFIED"
        : problem.provenanceStatus,
    copyrightStatus: problem.copyrightStatus,
    reviewStatus:
      pipeline.recommendedStatus === "APPROVED" ? "APPROVED" : problem.reviewStatus,
    explanation: problem.explanation,
    correctAnswer: problem.correctAnswer,
    sourceId: problem.sourceId,
    sourceName: problem.sourceName,
    usageType: problem.usageType,
    type: problem.type,
    choicesJson: problem.choicesJson,
    distractorRationaleJson: problem.distractorRationaleJson,
    answerValidationMethod: problem.answerValidationMethod,
    aiGenerated: problem.aiGenerated,
    performanceCorrectRate: null,
  });

  const studentReady =
    pipeline.canShowToStudents && confidence.level !== "NEEDS_REVIEW";

  await prisma.$transaction([
    ...pipeline.results.map((result) =>
      prisma.problemValidationRun.create({
        data: {
          problemId,
          validationType: result.validationType,
          status: result.status,
          detailsJson: result.details as object,
        },
      }),
    ),
    prisma.problem.update({
      where: { id: problemId },
      data: {
        reviewStatus: studentReady ? "APPROVED" : pipeline.recommendedStatus,
        approved: studentReady,
        studentReady,
        isActive: pipeline.recommendedStatus !== "REJECTED",
        canShowToStudent: studentReady,
        provenanceStatus: studentReady ? "VERIFIED" : problem.provenanceStatus,
        confidenceScore: confidence.score,
        confidenceLevel: confidence.level,
      },
    }),
  ]);

  return pipeline;
}
