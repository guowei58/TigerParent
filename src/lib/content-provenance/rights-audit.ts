import { prisma } from "@/lib/db";
import { displayChoicesForProblem } from "@/lib/mcq-choices";

export async function getContentRightsAuditReport() {
  const [
    unknownSource,
    unknownCopyright,
    generatedLabeledOfficial,
    missingAnswerKey,
    missingExplanation,
    noStandardAlignment,
    approvedWithoutVerification,
    lowConfidenceApproved,
    mcqGenericDistractors,
    byContentClass,
    byConfidence,
  ] = await Promise.all([
    prisma.problem.count({
      where: {
        isActive: true,
        sourceId: null,
        OR: [{ sourceName: null }, { sourceName: "" }],
      },
    }),
    prisma.problem.count({
      where: { isActive: true, copyrightStatus: "UNKNOWN" },
    }),
    prisma.problem.count({
      where: {
        isActive: true,
        contentClass: "GENERATED",
        OR: [
          { usageType: "OFFICIAL_RELEASED" },
          { usageType: "STAAR_PRACTICE" },
          { sourceExam: { contains: "STAAR" } },
          { sourceExam: { contains: "SAT" } },
        ],
      },
    }),
    prisma.problem.count({
      where: {
        isActive: true,
        correctAnswer: "",
      },
    }),
    prisma.problem.count({
      where: {
        isActive: true,
        OR: [{ explanation: null }, { explanation: "" }],
      },
    }),
    prisma.problem.findMany({
      where: { isActive: true, standardAlignments: { none: {} } },
      take: 30,
      include: { skill: { include: { subject: true } } },
    }),
    prisma.problem.count({
      where: {
        reviewStatus: "APPROVED",
        provenanceStatus: { in: ["UNKNOWN", "NEEDS_REVIEW"] },
      },
    }),
    prisma.problem.count({
      where: {
        reviewStatus: "APPROVED",
        confidenceLevel: { in: ["LOW", "NEEDS_REVIEW"] },
        studentReady: true,
      },
    }),
    prisma.problem.findMany({
      where: {
        isActive: true,
        type: "MULTIPLE_CHOICE",
        OR: [
          { prompt: { contains: "made-up definition" } },
          { choicesJson: { string_contains: "Random step" } },
        ],
      },
      take: 20,
      select: { id: true, prompt: true, skillId: true },
    }),
    prisma.problem.groupBy({
      by: ["contentClass"],
      _count: { _all: true },
      where: { isActive: true },
    }),
    prisma.problem.groupBy({
      by: ["confidenceLevel"],
      _count: { _all: true },
      where: { isActive: true },
    }),
  ]);

  return {
    unknownSource,
    unknownCopyright,
    generatedLabeledOfficial,
    missingAnswerKey,
    missingExplanation,
    skillsWithoutStandards: noStandardAlignment,
    approvedWithoutVerification,
    lowConfidenceApproved,
    mcqGenericDistractors,
    byContentClass,
    byConfidence,
  };
}

export async function getMcqPositionAudit() {
  const mcq = await prisma.problem.findMany({
    where: { type: "MULTIPLE_CHOICE", isActive: true },
    select: {
      id: true,
      choicesJson: true,
      choicesWithIdsJson: true,
      correctAnswer: true,
      correctChoiceId: true,
      skill: { select: { title: true, subject: { select: { slug: true } } } },
    },
    take: 5000,
  });

  let firstPosition = 0;
  const bySubject: Record<string, { total: number; first: number }> = {};

  for (const problem of mcq) {
    const displayed = displayChoicesForProblem(problem);
    if (!displayed.length) continue;
    const subject = problem.skill.subject.slug;
    bySubject[subject] = bySubject[subject] ?? { total: 0, first: 0 };
    bySubject[subject].total += 1;
    if (displayed[0]?.isCorrect) {
      firstPosition += 1;
      bySubject[subject].first += 1;
    }
  }

  const skills = await prisma.problem.groupBy({
    by: ["skillId"],
    where: { type: "MULTIPLE_CHOICE", isActive: true },
    _count: { _all: true },
  });

  return {
    sampleSize: mcq.length,
    correctAnswerFirstCount: firstPosition,
    correctAnswerFirstRate: mcq.length ? firstPosition / mcq.length : 0,
    bySubject: Object.entries(bySubject).map(([subject, stats]) => ({
      subject,
      total: stats.total,
      firstPositionRate: stats.total ? stats.first / stats.total : 0,
    })),
    skillCount: skills.length,
  };
}

export async function getSkillHighConfidenceGap() {
  const skills = await prisma.skill.findMany({
    include: {
      subject: true,
      _count: {
        select: {
          problems: {
            where: {
              isActive: true,
              reviewStatus: "APPROVED",
              confidenceLevel: "HIGH",
            },
          },
        },
      },
    },
  });

  return skills
    .filter((s) => s._count.problems < (s.isFoundationSkill ? 10 : 5))
    .map((s) => ({
      skill: s,
      highConfidenceCount: s._count.problems,
      minRequired: s.isFoundationSkill ? 10 : 5,
    }))
    .slice(0, 40);
}
