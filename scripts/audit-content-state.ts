import { prisma } from "../src/lib/db";
import { studentVisibleProblemWhere } from "../src/lib/problem-student-gate";

async function main() {
  const [
    total,
    studentVisible,
    missingExplanation,
    missingAnswer,
    missingSource,
    mcqTotal,
    mcqNoChoiceId,
    needsReview,
    lowConfidenceApproved,
  ] = await Promise.all([
    prisma.problem.count(),
    prisma.problem.count({ where: studentVisibleProblemWhere() }),
    prisma.problem.count({
      where: { isActive: true, OR: [{ explanation: null }, { explanation: "" }] },
    }),
    prisma.problem.count({ where: { isActive: true, correctAnswer: "" } }),
    prisma.problem.count({
      where: {
        isActive: true,
        sourceId: null,
        OR: [{ sourceName: null }, { sourceName: "" }],
      },
    }),
    prisma.problem.count({ where: { type: "MULTIPLE_CHOICE", isActive: true } }),
    prisma.problem.count({
      where: { type: "MULTIPLE_CHOICE", isActive: true, correctChoiceId: null },
    }),
    prisma.problem.count({ where: { reviewStatus: { in: ["NEEDS_REVIEW", "DRAFT"] } } }),
    prisma.problem.count({
      where: { reviewStatus: "APPROVED", confidenceLevel: { in: ["LOW", "NEEDS_REVIEW"] } },
    }),
  ]);

  console.log(JSON.stringify({
    total,
    studentVisible,
    missingExplanation,
    missingAnswer,
    missingSource,
    mcqTotal,
    mcqNoChoiceId,
    needsReview,
    lowConfidenceApproved,
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
