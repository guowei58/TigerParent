import { prisma } from "@/lib/db";

export type SatFoundationProgress = {
  domains: Array<{
    domain: string;
    totalSkills: number;
    masteredSkills: number;
    inProgressSkills: number;
    percentReady: number;
  }>;
  overallFoundationPercent: number;
  schoolReadinessLabel: string;
  confidenceLabel: string;
  disclaimer: string;
};

export async function getSatFoundationProgress(
  studentId: string,
): Promise<SatFoundationProgress> {
  const maps = await prisma.sATReadinessSkillMap.findMany({
    include: {
      skill: {
        include: {
          mastery: { where: { studentId } },
          subject: true,
        },
      },
    },
  });

  const byDomain = new Map<
    string,
    { total: number; mastered: number; inProgress: number }
  >();

  for (const row of maps) {
    const bucket = byDomain.get(row.satDomain) ?? {
      total: 0,
      mastered: 0,
      inProgress: 0,
    };
    bucket.total += 1;
    const mastery = row.skill.mastery[0];
    if (mastery?.status === "MASTERED") bucket.mastered += 1;
    else if (mastery && mastery.attemptsCount >= 5) bucket.inProgress += 1;
    byDomain.set(row.satDomain, bucket);
  }

  const domains = [...byDomain.entries()].map(([domain, stats]) => ({
    domain,
    totalSkills: stats.total,
    masteredSkills: stats.mastered,
    inProgressSkills: stats.inProgress,
    percentReady:
      stats.total === 0
        ? 0
        : Math.round((stats.mastered / stats.total) * 100),
  }));

  const overallFoundationPercent =
    domains.length === 0
      ? 0
      : Math.round(
          domains.reduce((sum, d) => sum + d.percentReady, 0) / domains.length,
        );

  const placements = await prisma.studentSubjectPlacement.findMany({
    where: { studentId },
  });
  const avgGradeDelta =
    placements.length === 0
      ? 0
      : placements.reduce(
          (sum, p) => sum + (p.assessedGradeLevel - p.schoolGrade),
          0,
        ) / placements.length;

  let schoolReadinessLabel = "Building toward grade-level school readiness";
  if (avgGradeDelta >= 1) {
    schoolReadinessLabel = "Developing skills ahead of current grade level";
  } else if (avgGradeDelta <= -0.5) {
    schoolReadinessLabel = "Strengthening foundation skills for grade-level readiness";
  }

  return {
    domains,
    overallFoundationPercent,
    schoolReadinessLabel,
    confidenceLabel: "Improving fluency and confidence through mastery-based practice",
    disclaimer:
      "Progress tracks long-term college-readiness foundations — not a guaranteed SAT score or specific grade outcome.",
  };
}
