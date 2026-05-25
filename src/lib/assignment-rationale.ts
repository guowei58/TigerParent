import { prisma } from "@/lib/db";
import { getSessionContentMix } from "@/lib/content-provenance/benchmark";
import { confidenceLabel } from "@/lib/content-provenance/confidence";

export type AssignmentRationale = {
  headline: string;
  reasons: string[];
  skillTitle: string;
  subjectName: string;
  gradeLevel: number;
  difficulty: number;
  standardCodes: string[];
  assignmentType: "review" | "remediation" | "current" | "advanced" | "practice";
  contentMix?: {
    officialPercent: number;
    licensedPercent: number;
    generatedPercent: number;
    averageConfidence: number;
    count: number;
  };
  contentClass?: string;
  confidenceLevel?: string;
  lowConfidenceWarning?: string;
};

export async function getAssignmentRationaleForProblem(
  studentId: string,
  problemId: string,
  sessionType?: string,
  sessionId?: string,
): Promise<AssignmentRationale | null> {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      skill: { include: { subject: true } },
      standardAlignments: { include: { standard: true } },
    },
  });
  if (!problem) return null;

  const mastery = await prisma.masteryState.findUnique({
    where: {
      studentId_skillId: { studentId, skillId: problem.skillId },
    },
  });

  const overdueReview = await prisma.reviewQueueItem.findFirst({
    where: {
      studentId,
      skillId: problem.skillId,
      completed: false,
      dueAt: { lte: new Date() },
    },
  });

  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: {
      studentId_subjectId: {
        studentId,
        subjectId: problem.skill.subjectId,
      },
    },
  });

  const reasons: string[] = [];
  let assignmentType: AssignmentRationale["assignmentType"] = "practice";

  if (sessionType === "DAILY_MISSION") {
    reasons.push("Part of today's daily mission practice plan.");
  }

  if (overdueReview) {
    assignmentType = "review";
    reasons.push("This skill is due for spaced review.");
  }

  if (mastery && mastery.accuracy < 0.7 && mastery.attemptsCount >= 5) {
    assignmentType = "remediation";
    reasons.push(
      `Assigned because recent accuracy on ${problem.skill.title} is ${Math.round(mastery.accuracy * 100)}%.`,
    );
  }

  if (
    placement?.currentSkillId === problem.skillId &&
    assignmentType === "practice"
  ) {
    assignmentType = "current";
    reasons.push("This is the student's current working skill in the roadmap.");
  }

  if (
    placement &&
    problem.gradeLevel > placement.assessedGradeLevel + 1
  ) {
    assignmentType = "advanced";
    reasons.push("Stretch problem — above current assessed grade level.");
  }

  if (reasons.length === 0) {
    reasons.push(`Building mastery in ${problem.skill.title}.`);
  }

  const contentMix = sessionId ? await getSessionContentMix(sessionId) : undefined;

  const highConfidenceCount = await prisma.problem.count({
    where: {
      skillId: problem.skillId,
      isActive: true,
      reviewStatus: "APPROVED",
      confidenceLevel: "HIGH",
    },
  });

  const lowConfidenceWarning =
    highConfidenceCount < (problem.skill.isFoundationSkill ? 10 : 5)
      ? "This skill needs more reviewed content before it should be used for high-stakes mastery."
      : undefined;

  return {
    headline: `Why this ${problem.skill.subject.name} problem?`,
    reasons,
    skillTitle: problem.skill.title,
    subjectName: problem.skill.subject.name,
    gradeLevel: problem.gradeLevel,
    difficulty: problem.difficulty,
    standardCodes: problem.standardAlignments.map((a) => a.standard.standardCode),
    assignmentType,
    contentMix,
    contentClass: problem.contentClass,
    confidenceLevel: confidenceLabel(problem.confidenceLevel),
    lowConfidenceWarning,
  };
}
