import type {
  ConfidenceLevel,
  CopyrightStatus,
  ProblemContentClass,
  ProblemReviewStatus,
  ProvenanceStatus,
} from "@/generated/prisma/client";
import { isGenericDistractor } from "@/lib/mcq-choices";

export type ConfidenceInput = {
  contentClass: ProblemContentClass;
  provenanceStatus: ProvenanceStatus;
  copyrightStatus: CopyrightStatus;
  reviewStatus: ProblemReviewStatus;
  explanation: string | null;
  correctAnswer: string;
  sourceId: string | null;
  sourceName: string | null;
  usageType: string;
  type: string;
  choicesJson?: unknown;
  distractorRationaleJson?: unknown;
  answerValidationMethod?: string;
  performanceCorrectRate?: number | null;
  aiGenerated?: boolean;
};

const OFFICIAL_LABEL_PATTERN =
  /\b(STAAR|TEKS|SAT|College Board|official exam|released test)\b/i;

export function computeProblemConfidence(input: ConfidenceInput): {
  score: number;
  level: ConfidenceLevel;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  if (input.contentClass === "OFFICIAL_RELEASED") {
    score += 35;
    reasons.push("Official released source class");
  } else if (input.contentClass === "LICENSED_OR_OER") {
    score += 28;
    reasons.push("Licensed/OER source class");
  } else {
    score += 10;
    reasons.push("Generated source class");
  }

  if (input.provenanceStatus === "VERIFIED") {
    score += 20;
  } else if (input.provenanceStatus === "NEEDS_REVIEW") {
    score += 5;
  }

  if (input.reviewStatus === "APPROVED") {
    score += 15;
  }

  if (input.explanation?.trim()) {
    score += 10;
  }

  if (input.correctAnswer.trim()) {
    score += 5;
  }

  if (input.sourceId || input.sourceName) {
    score += 5;
  }

  if (
    input.answerValidationMethod === "NUMERIC_TOLERANCE" ||
    input.answerValidationMethod === "EXPRESSION_EQUIVALENCE"
  ) {
    score += 8;
    reasons.push("Deterministic answer validation");
  }

  if (input.type === "MULTIPLE_CHOICE") {
    const choices = Array.isArray(input.choicesJson)
      ? (input.choicesJson as string[])
      : [];
    const rationales =
      input.distractorRationaleJson &&
      typeof input.distractorRationaleJson === "object"
        ? Object.keys(input.distractorRationaleJson as object).length
        : 0;
    const genericCount = choices.filter((c) => isGenericDistractor(c)).length;
    if (genericCount > 0) {
      score -= 20;
      reasons.push("Generic distractors detected");
    } else if (rationales >= Math.max(choices.length - 1, 0)) {
      score += 10;
      reasons.push("Distractor rationales present");
    } else {
      score -= 5;
      reasons.push("Missing distractor rationales");
    }
  }

  if (input.performanceCorrectRate != null) {
    if (input.performanceCorrectRate >= 0.35 && input.performanceCorrectRate <= 0.92) {
      score += 5;
    }
  }

  if (
    input.contentClass === "GENERATED" &&
    OFFICIAL_LABEL_PATTERN.test(input.explanation ?? "")
  ) {
    score -= 25;
    reasons.push("Generated item may be mislabeled as official");
  }

  score = Math.max(0, Math.min(100, score));

  let level: ConfidenceLevel = "NEEDS_REVIEW";
  if (score >= 75) level = "HIGH";
  else if (score >= 50) level = "MEDIUM";
  else if (score >= 25) level = "LOW";

  if (input.reviewStatus !== "APPROVED" || input.provenanceStatus === "UNKNOWN") {
    level = "NEEDS_REVIEW";
  }

  return { score, level, reasons };
}

export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "High confidence";
    case "MEDIUM":
      return "Medium confidence";
    case "LOW":
      return "Low confidence";
    default:
      return "Needs review";
  }
}

export function minConfidenceForSessionType(sessionType: string): ConfidenceLevel {
  switch (sessionType) {
    case "DIAGNOSTIC":
    case "MASTERY_CHALLENGE":
    case "BENCHMARK":
    case "TEST":
      return "HIGH";
    case "QUIZ":
      return "MEDIUM";
    default:
      return "MEDIUM";
  }
}

export function confidenceMeetsMinimum(
  level: ConfidenceLevel,
  minimum: ConfidenceLevel,
): boolean {
  const order: ConfidenceLevel[] = ["NEEDS_REVIEW", "LOW", "MEDIUM", "HIGH"];
  return order.indexOf(level) >= order.indexOf(minimum);
}
