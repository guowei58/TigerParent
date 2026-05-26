import type { ReadinessConfidenceBand } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSessionContentMix } from "@/lib/content-provenance/benchmark";

function bandFromScore(score: number): ReadinessConfidenceBand {
  if (score >= 92) return "ADVANCED";
  if (score >= 85) return "STRONG";
  if (score >= 75) return "ON_GRADE_LEVEL";
  if (score >= 60) return "APPROACHING_GRADE_LEVEL";
  return "NEEDS_FOUNDATION";
}

export async function recomputeSchoolReadiness(studentId: string, subjectId: string) {
  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
  });
  const gradeLevel = placement?.schoolGrade ?? 3;

  const [masteries, homework, quizzes, benchmarks, sessions] = await Promise.all([
    prisma.masteryState.findMany({
      where: { studentId, skill: { subjectId } },
      select: { masteryScore: true, retentionScore: true, status: true },
    }),
    prisma.assignment.findMany({
      where: { studentId, subjectId, assignmentType: "HOMEWORK", status: "COMPLETED" },
      include: { session: true },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
    prisma.testResult.findMany({
      where: { studentId, testType: "QUIZ" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.testResult.findMany({
      where: { studentId, testType: { in: ["BENCHMARK", "STAAR_STYLE"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.practiceSession.findMany({
      where: { studentId, completed: true },
      orderBy: { endedAt: "desc" },
      take: 20,
      select: { id: true },
    }),
  ]);

  const standardsMastery =
    masteries.length > 0
      ? masteries.reduce((s, m) => s + m.masteryScore, 0) / masteries.length
      : 0;
  const retentionScore =
    masteries.length > 0
      ? masteries.reduce((s, m) => s + m.retentionScore, 0) / masteries.length
      : 0;

  const homeworkPerformance =
    homework.length > 0
      ? homework.reduce((s, h) => s + (h.session?.accuracy ?? 0), 0) / homework.length
      : 0;
  const quizPerformance =
    quizzes.length > 0 ? quizzes.reduce((s, q) => s + q.accuracy, 0) / quizzes.length : 0;
  const benchmarkPerformance =
    benchmarks.length > 0
      ? benchmarks.reduce((s, b) => s + b.accuracy, 0) / benchmarks.length
      : 0;

  let sourceBackedTotal = 0;
  let sourceBackedOfficial = 0;
  for (const session of sessions.slice(0, 10)) {
    const mix = await getSessionContentMix(session.id);
    sourceBackedTotal += mix.count;
    sourceBackedOfficial += Math.round((mix.officialPercent / 100) * mix.count);
  }
  const sourceBackedCoverageScore =
    sourceBackedTotal > 0 ? (sourceBackedOfficial / sourceBackedTotal) * 100 : 0;

  const fluencySessions = await prisma.practiceSession.count({
    where: { studentId, sessionType: "DRILL", completed: true },
  });
  const fluencyScore = Math.min(100, fluencySessions * 8);

  const consistencyScore = Math.min(
    100,
    (await prisma.practiceSession.count({
      where: {
        studentId,
        completed: true,
        startedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    })) * 7,
  );

  const weakAreas = masteries
    .filter((m) => m.masteryScore < 70)
    .slice(0, 5)
    .map((_, i) => `skill-gap-${i + 1}`);

  const composite =
    standardsMastery * 0.25 +
    homeworkPerformance * 100 * 0.2 +
    quizPerformance * 100 * 0.2 +
    benchmarkPerformance * 100 * 0.15 +
    retentionScore * 0.1 +
    sourceBackedCoverageScore * 0.1;

  const confidenceBand = bandFromScore(composite);

  return prisma.schoolReadinessScore.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    update: {
      gradeLevel,
      standardsMastery,
      homeworkPerformance: homeworkPerformance * 100,
      quizPerformance: quizPerformance * 100,
      benchmarkPerformance: benchmarkPerformance * 100,
      fluencyScore,
      retentionScore,
      consistencyScore,
      sourceBackedCoverageScore,
      weakAreasJson: weakAreas,
      confidenceBand,
    },
    create: {
      studentId,
      subjectId,
      gradeLevel,
      standardsMastery,
      homeworkPerformance: homeworkPerformance * 100,
      quizPerformance: quizPerformance * 100,
      benchmarkPerformance: benchmarkPerformance * 100,
      fluencyScore,
      retentionScore,
      consistencyScore,
      sourceBackedCoverageScore,
      weakAreasJson: weakAreas,
      confidenceBand,
    },
  });
}

export function readinessBandLabel(band: ReadinessConfidenceBand) {
  switch (band) {
    case "NEEDS_FOUNDATION":
      return "Needs foundation";
    case "APPROACHING_GRADE_LEVEL":
      return "Approaching grade level";
    case "ON_GRADE_LEVEL":
      return "On grade level";
    case "AHEAD":
      return "Ahead";
    case "STRONG":
      return "Strong";
    case "ADVANCED":
      return "Advanced";
  }
}
