import { prisma } from "@/lib/db";

export type BenchmarkCalibration = {
  skillId: string;
  skillTitle: string;
  officialCorrectRate: number | null;
  generatedCorrectRate: number | null;
  officialCount: number;
  generatedCount: number;
  calibration: "TOO_EASY" | "TOO_HARD" | "CONFUSING" | "ALIGNED" | "INSUFFICIENT_DATA";
  notes: string;
};

export async function calibrateSkillDifficulty(skillId: string): Promise<BenchmarkCalibration> {
  const skill = await prisma.skill.findUniqueOrThrow({
    where: { id: skillId },
    select: { id: true, title: true },
  });

  const [officialAttempts, generatedAttempts] = await Promise.all([
    prisma.attempt.findMany({
      where: {
        problem: {
          skillId,
          contentClass: "OFFICIAL_RELEASED",
          isActive: true,
        },
      },
      select: { isCorrect: true },
    }),
    prisma.attempt.findMany({
      where: {
        problem: {
          skillId,
          contentClass: "GENERATED",
          isActive: true,
        },
      },
      select: { isCorrect: true },
    }),
  ]);

  const officialCorrectRate =
    officialAttempts.length === 0
      ? null
      : officialAttempts.filter((a) => a.isCorrect).length / officialAttempts.length;

  const generatedCorrectRate =
    generatedAttempts.length === 0
      ? null
      : generatedAttempts.filter((a) => a.isCorrect).length / generatedAttempts.length;

  if (officialCorrectRate == null || generatedCorrectRate == null) {
    return {
      skillId: skill.id,
      skillTitle: skill.title,
      officialCorrectRate,
      generatedCorrectRate,
      officialCount: officialAttempts.length,
      generatedCount: generatedAttempts.length,
      calibration: "INSUFFICIENT_DATA",
      notes: "Need both official and generated attempt data.",
    };
  }

  const delta = generatedCorrectRate - officialCorrectRate;
  let calibration: BenchmarkCalibration["calibration"] = "ALIGNED";
  let notes = "Generated difficulty aligns with official anchor.";

  if (delta > 0.25) {
    calibration = "TOO_EASY";
    notes = "Generated questions appear much easier than official released items.";
  } else if (delta < -0.25) {
    calibration = "TOO_HARD";
    notes = "Generated questions appear much harder or more confusing than official items.";
  } else if (generatedCorrectRate < 0.25 && officialCorrectRate > 0.4) {
    calibration = "CONFUSING";
    notes = "Generated items have unusually low success vs official benchmarks.";
  }

  return {
    skillId: skill.id,
    skillTitle: skill.title,
    officialCorrectRate,
    generatedCorrectRate,
    officialCount: officialAttempts.length,
    generatedCount: generatedAttempts.length,
    calibration,
    notes,
  };
}

export async function getSessionContentMix(sessionId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { sessionId },
    include: {
      problem: {
        select: {
          contentClass: true,
          confidenceScore: true,
          confidenceLevel: true,
        },
      },
    },
  });

  if (!attempts.length) {
    return {
      officialPercent: 0,
      licensedPercent: 0,
      generatedPercent: 0,
      averageConfidence: 0,
      count: 0,
    };
  }

  let official = 0;
  let licensed = 0;
  let generated = 0;
  let confidenceSum = 0;

  for (const attempt of attempts) {
    confidenceSum += attempt.problem.confidenceScore;
    switch (attempt.problem.contentClass) {
      case "OFFICIAL_RELEASED":
        official += 1;
        break;
      case "LICENSED_OR_OER":
        licensed += 1;
        break;
      default:
        generated += 1;
    }
  }

  const total = attempts.length;
  return {
    officialPercent: Math.round((official / total) * 100),
    licensedPercent: Math.round((licensed / total) * 100),
    generatedPercent: Math.round((generated / total) * 100),
    averageConfidence: Math.round(confidenceSum / total),
    count: total,
  };
}
