import { prisma } from "@/lib/db";

export async function getContentAuditReport() {
  const [
    skills,
    approvedProblems,
    draftProblems,
    rejectedProblems,
    skillsWithoutStandards,
    problemsNoExplanation,
    problemsNoSolutionSteps,
    openFlags,
    skillsProblemCounts,
  ] = await Promise.all([
    prisma.skill.findMany({
      include: {
        subject: true,
        standardAlignments: true,
        _count: { select: { problems: true } },
      },
      orderBy: [{ subject: { name: "asc" } }, { sequence: "asc" }],
    }),
    prisma.problem.count({ where: { reviewStatus: "APPROVED", studentReady: true } }),
    prisma.problem.count({
      where: { reviewStatus: { in: ["DRAFT", "NEEDS_REVIEW"] } },
    }),
    prisma.problem.count({ where: { reviewStatus: "REJECTED" } }),
    prisma.skill.findMany({
      where: { standardAlignments: { none: {} } },
      include: { subject: true },
      take: 50,
    }),
    prisma.problem.count({
      where: {
        OR: [{ explanation: null }, { explanation: "" }],
        isActive: true,
      },
    }),
    prisma.problem.count({
      where: {
        skill: { subject: { slug: "math" } },
        solutionStepsJson: { equals: [] },
        isActive: true,
      },
    }),
    prisma.problemFlag.count({ where: { status: "OPEN" } }),
    prisma.problem.groupBy({
      by: ["skillId", "reviewStatus"],
      _count: { _all: true },
      where: { isActive: true },
    }),
  ]);

  const countBySkill = new Map<
    string,
    { approved: number; draft: number; total: number }
  >();

  for (const row of skillsProblemCounts) {
    const existing = countBySkill.get(row.skillId) ?? {
      approved: 0,
      draft: 0,
      total: 0,
    };
    existing.total += row._count._all;
    if (row.reviewStatus === "APPROVED") existing.approved += row._count._all;
    else existing.draft += row._count._all;
    countBySkill.set(row.skillId, existing);
  }

  const skillsBelowThreshold = skills
    .map((skill) => {
      const counts = countBySkill.get(skill.id) ?? { approved: 0, draft: 0, total: 0 };
      const minRequired = skill.isFoundationSkill ? 50 : 20;
      return {
        skill,
        ...counts,
        minRequired,
        gap: Math.max(0, minRequired - counts.approved),
      };
    })
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  return {
    totals: {
      skills: skills.length,
      approvedProblems,
      draftProblems,
      rejectedProblems,
      problemsNoExplanation,
      problemsNoSolutionSteps,
      openFlags,
    },
    skillsBelowThreshold,
    skillsWithoutStandards,
  };
}

export async function getProblemReviewQueue(limit = 30) {
  return prisma.problem.findMany({
    where: {
      reviewStatus: { in: ["NEEDS_REVIEW", "DRAFT"] },
      isActive: true,
    },
    include: {
      skill: { include: { subject: true } },
      standardAlignments: { include: { standard: true } },
      validationRuns: { orderBy: { createdAt: "desc" }, take: 12 },
      performanceStats: true,
      flags: { where: { status: "OPEN" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}
