import type { Prisma } from "@/generated/prisma/client";
import { confidenceMeetsMinimum, minConfidenceForSessionType } from "./confidence";

/** Student-visible problems must pass provenance + QA gates. */
export function studentVisibleProblemWhere(
  sessionType?: string,
): Prisma.ProblemWhereInput {
  const minLevel = sessionType
    ? minConfidenceForSessionType(sessionType)
    : "MEDIUM";

  const confidenceFilter: Prisma.ProblemWhereInput =
    minLevel === "HIGH"
      ? { confidenceLevel: "HIGH" }
      : minLevel === "MEDIUM"
        ? { confidenceLevel: { in: ["HIGH", "MEDIUM"] } }
        : {};

  return {
    reviewStatus: "APPROVED",
    studentReady: true,
    isActive: true,
    approved: true,
    canShowToStudent: true,
    provenanceStatus: "VERIFIED",
    copyrightStatus: { not: "UNKNOWN" },
    explanation: { not: null },
    NOT: [{ explanation: "" }],
    ...confidenceFilter,
  };
}

export function assertStudentVisibleProblem(problem: {
  reviewStatus: string;
  studentReady: boolean;
  isActive: boolean;
  approved: boolean;
  canShowToStudent: boolean;
  provenanceStatus: string;
  copyrightStatus: string;
  contentClass: string;
  explanation: string | null;
  sourceId: string | null;
  sourceName: string | null;
  confidenceLevel: string;
  sessionType?: string;
}) {
  if (problem.reviewStatus !== "APPROVED") {
    throw new Error("Problem is not approved for student use");
  }
  if (!problem.studentReady || !problem.isActive || !problem.approved) {
    throw new Error("Problem failed student readiness gate");
  }
  if (!problem.canShowToStudent) {
    throw new Error("Problem is not cleared for student display");
  }
  if (!problem.explanation?.trim()) {
    throw new Error("Problem missing explanation");
  }
  if (!problem.sourceId && !problem.sourceName) {
    throw new Error("Problem missing documented source");
  }
  if (problem.copyrightStatus === "UNKNOWN") {
    throw new Error("Problem copyright status unknown");
  }
  if (problem.provenanceStatus === "REJECTED" || problem.provenanceStatus === "UNKNOWN") {
    throw new Error("Problem provenance not verified");
  }

  const minimum = minConfidenceForSessionType(problem.sessionType ?? "PRACTICE");
  if (
    !confidenceMeetsMinimum(
      problem.confidenceLevel as "HIGH" | "MEDIUM" | "LOW" | "NEEDS_REVIEW",
      minimum,
    )
  ) {
    throw new Error(`Problem confidence too low for ${problem.sessionType ?? "practice"}`);
  }
}

/** Imported/official items require full provenance before approval. */
export function importedProblemApprovalRequirements(problem: {
  contentClass: string;
  correctAnswer: string;
  explanation: string | null;
  gradeLevel: number;
  sourceId: string | null;
  sourceName: string | null;
  standardAlignmentsCount: number;
}): string[] {
  const missing: string[] = [];
  if (!problem.sourceId && !problem.sourceName) missing.push("source");
  if (!problem.correctAnswer.trim()) missing.push("answer key");
  if (!problem.explanation?.trim()) missing.push("explanation/rationale");
  if (!problem.gradeLevel && problem.gradeLevel !== 0) missing.push("grade level");
  if (problem.standardAlignmentsCount === 0) missing.push("standard alignment");
  if (
    problem.contentClass === "OFFICIAL_RELEASED" &&
    !problem.sourceId
  ) {
    missing.push("registered content source");
  }
  return missing;
}
