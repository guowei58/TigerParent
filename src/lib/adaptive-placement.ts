import type { Skill } from "@/generated/prisma/client";
import { prisma } from "./db";
import { advanceToNextSkill } from "./mastery";

const REGRESS_WINDOW = 8;
const REGRESS_MIN_ATTEMPTS = 5;
const REGRESS_ACCURACY = 0.45;

const FAST_ADVANCE_MIN_ATTEMPTS = 10;
const FAST_ADVANCE_ACCURACY = 0.92;

async function updatePlacement(
  studentId: string,
  subjectId: string,
  levelId: string,
  skillId: string,
  assessedGradeLevel: number,
  schoolGrade: number,
) {
  await prisma.studentSubjectPlacement.updateMany({
    where: { studentId, subjectId },
    data: {
      currentLevelId: levelId,
      currentSkillId: skillId,
      assessedGradeLevel,
      monthsAheadOrBehind: assessedGradeLevel - schoolGrade,
      lastUpdatedAt: new Date(),
    },
  });
}

export async function regressToPreviousSkill(
  studentId: string,
  currentSkill: Skill,
) {
  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId: currentSkill.subjectId } },
  });
  if (!placement) return null;

  const prevInLevel = await prisma.skill.findFirst({
    where: {
      levelId: currentSkill.levelId,
      sequence: { lt: currentSkill.sequence },
    },
    orderBy: { sequence: "desc" },
  });

  if (prevInLevel) {
    const level = await prisma.level.findUniqueOrThrow({
      where: { id: currentSkill.levelId },
    });
    await updatePlacement(
      studentId,
      currentSkill.subjectId,
      level.id,
      prevInLevel.id,
      level.nominalGradeLevel,
      placement.schoolGrade,
    );
    await prisma.masteryState.updateMany({
      where: { studentId, skillId: currentSkill.id },
      data: { status: "REGRESSED", masteryScore: { multiply: 0.7 } },
    });
    return prevInLevel;
  }

  const currentLevel = await prisma.level.findUniqueOrThrow({
    where: { id: currentSkill.levelId },
  });
  const prevLevel = await prisma.level.findFirst({
    where: {
      subjectId: currentSkill.subjectId,
      sequence: { lt: currentLevel.sequence },
    },
    orderBy: { sequence: "desc" },
    include: { skills: { orderBy: { sequence: "desc" }, take: 1 } },
  });

  if (!prevLevel?.skills[0]) return null;

  await updatePlacement(
    studentId,
    currentSkill.subjectId,
    prevLevel.id,
    prevLevel.skills[0].id,
    prevLevel.nominalGradeLevel,
    placement.schoolGrade,
  );
  await prisma.masteryState.updateMany({
    where: { studentId, skillId: currentSkill.id },
    data: { status: "REGRESSED", masteryScore: { multiply: 0.7 } },
  });
  return prevLevel.skills[0];
}

async function recentSkillAttempts(studentId: string, skillId: string, take: number) {
  return prisma.attempt.findMany({
    where: { studentId, problem: { skillId } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

function medianSeconds(attempts: { elapsedSeconds: number }[]) {
  const times = attempts.map((a) => a.elapsedSeconds).sort((a, b) => a - b);
  if (!times.length) return 0;
  return times.length % 2 === 1
    ? times[Math.floor(times.length / 2)]
    : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
}

/** Adjust level down on struggle, up when work is consistently easy and accurate. */
export async function evaluateAdaptivePlacement(
  studentId: string,
  skillId: string,
) {
  const skill = await prisma.skill.findUniqueOrThrow({ where: { id: skillId } });
  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId: skill.subjectId } },
  });
  if (!placement?.currentSkillId) return null;

  if (placement.currentSkillId !== skillId) return null;

  const recent = await recentSkillAttempts(studentId, skillId, REGRESS_WINDOW);
  if (recent.length < REGRESS_MIN_ATTEMPTS) return null;

  const accuracy = recent.filter((a) => a.isCorrect).length / recent.length;

  if (accuracy < REGRESS_ACCURACY) {
    const moved = await regressToPreviousSkill(studentId, skill);
    if (moved) {
      return { direction: "down" as const, skillTitle: moved.title };
    }
    return null;
  }

  const mastery = await prisma.masteryState.findUnique({
    where: { studentId_skillId: { studentId, skillId } },
  });
  if (mastery?.status === "MASTERED") return null;

  const advancePool = await recentSkillAttempts(
    studentId,
    skillId,
    Math.max(FAST_ADVANCE_MIN_ATTEMPTS, REGRESS_WINDOW),
  );
  if (advancePool.length < FAST_ADVANCE_MIN_ATTEMPTS) return null;

  const advanceAccuracy =
    advancePool.filter((a) => a.isCorrect).length / advancePool.length;
  const advanceMedian = medianSeconds(advancePool);

  if (
    advanceAccuracy >= FAST_ADVANCE_ACCURACY &&
    advanceMedian <= skill.targetMedianSeconds
  ) {
    const next = await advanceToNextSkill(studentId, skill);
    if (next) {
      await prisma.masteryState.upsert({
        where: { studentId_skillId: { studentId, skillId } },
        create: {
          studentId,
          skillId,
          masteryScore: 88,
          accuracy: advanceAccuracy,
          medianSeconds: advanceMedian,
          attemptsCount: advancePool.length,
          correctCount: advancePool.filter((a) => a.isCorrect).length,
          sessionsCount: 1,
          status: "MASTERED",
        },
        update: { status: "MASTERED", masteryScore: 88 },
      });
      return { direction: "up" as const, skillTitle: next.title };
    }
  }

  return null;
}
