import type {
  Assignment,
  AssignmentStatus,
  AssignmentType,
  Problem,
} from "@/generated/prisma/client";

export type SourceMix = {
  officialPercent: number;
  licensedPercent: number;
  generatedPercent: number;
  privatePercent: number;
  humanReviewedPercent: number;
  averageConfidence: number;
  count: number;
};

export type DailyWorkItem = {
  assignment: Assignment;
  label: string;
  description: string;
  estimatedMinutes: number;
  href: string;
  priority: number;
};

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  HOMEWORK: "Homework",
  DRILL: "Drill",
  QUIZ: "Quiz",
  TEST: "Unit Test",
  BENCHMARK: "Benchmark",
  RETAKE: "Retake",
  CHALLENGE: "Challenge",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  ASSIGNED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  REVIEWED: "Reviewed",
  OVERDUE: "Overdue",
};

export function assignmentSessionType(type: AssignmentType) {
  switch (type) {
    case "HOMEWORK":
      return "HOMEWORK" as const;
    case "DRILL":
      return "DRILL" as const;
    case "QUIZ":
      return "QUIZ" as const;
    case "TEST":
      return "TEST" as const;
    case "BENCHMARK":
      return "BENCHMARK" as const;
    case "RETAKE":
      return "RETAKE" as const;
    case "CHALLENGE":
      return "CHALLENGE" as const;
  }
}

export function computeSourceMixFromProblems(problems: Pick<Problem, "contentClass" | "confidenceScore" | "copyrightStatus">[]): SourceMix {
  if (!problems.length) {
    return {
      officialPercent: 0,
      licensedPercent: 0,
      generatedPercent: 0,
      privatePercent: 0,
      humanReviewedPercent: 0,
      averageConfidence: 0,
      count: 0,
    };
  }

  let official = 0;
  let licensed = 0;
  let generated = 0;
  let privateCount = 0;
  let confidenceSum = 0;

  for (const p of problems) {
    confidenceSum += p.confidenceScore;
    switch (p.contentClass) {
      case "OFFICIAL_RELEASED":
        official += 1;
        break;
      case "LICENSED_OR_OER":
        licensed += 1;
        break;
      default:
        generated += 1;
    }
    if (p.copyrightStatus === "USER_PRIVATE") privateCount += 1;
  }

  const total = problems.length;
  return {
    officialPercent: Math.round((official / total) * 100),
    licensedPercent: Math.round((licensed / total) * 100),
    generatedPercent: Math.round((generated / total) * 100),
    privatePercent: Math.round((privateCount / total) * 100),
    humanReviewedPercent: 0,
    averageConfidence: Math.round(confidenceSum / total),
    count: total,
  };
}
