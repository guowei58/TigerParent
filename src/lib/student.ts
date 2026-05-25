import { prisma } from "./db";
import { parseJsonArray } from "./utils";
import {
  getActiveSubjectId,
  getPlacementForSubject,
} from "./student-subject";
import {
  canonicalSkillId,
  filterVisibleSkills,
  legacySkillIdsForCanonical,
  unitStatusLabel,
} from "./skill-catalog";
import { normalizePlacementSkillId } from "./skill-progression";

export async function getStudentDashboard(studentId: string) {
  const activeSubjectId = await getActiveSubjectId(studentId);

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      placements: {
        include: {
          subject: true,
          currentLevel: true,
          currentSkill: true,
        },
      },
      mastery: {
        where: { status: { in: ["LEARNING", "PRACTICING", "REVIEW"] } },
        include: { skill: true },
        take: 5,
      },
      achievements: { orderBy: { earnedAt: "desc" }, take: 5 },
    },
  });

  const reviewItems = await prisma.reviewQueueItem.count({
    where: {
      studentId,
      completed: false,
      dueAt: { lte: new Date() },
      ...(activeSubjectId ? { skill: { subjectId: activeSubjectId } } : {}),
    },
  });

  const mistakeCount = await prisma.attempt.count({
    where: {
      studentId,
      isCorrect: false,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      ...(activeSubjectId ? { problem: { skill: { subjectId: activeSubjectId } } } : {}),
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysMissions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      sessionType: "DAILY_MISSION",
      startedAt: { gte: todayStart },
    },
  });
  const todayMission = activeSubjectId
    ? todaysMissions.find(
        (m) =>
          (m.phaseJson as { primarySubjectId?: string } | null)
            ?.primarySubjectId === activeSubjectId,
      ) ?? null
    : todaysMissions[0] ?? null;

  const activePlacement = activeSubjectId
    ? await getPlacementForSubject(studentId, activeSubjectId)
    : student.placements[0];
  const currentSkill = activePlacement?.currentSkill;
  const currentMastery = currentSkill
    ? await prisma.masteryState.findUnique({
        where: {
          studentId_skillId: { studentId, skillId: currentSkill.id },
        },
      })
    : null;

  const nextSkill = currentSkill
    ? await prisma.skill.findFirst({
        where: {
          levelId: currentSkill.levelId,
          sequence: { gt: currentSkill.sequence },
        },
        orderBy: { sequence: "asc" },
      })
    : null;

  return {
    student,
    activeSubjectId,
    activePlacement,
    reviewItems,
    mistakeCount,
    todayMission,
    currentSkill,
    currentMastery,
    nextSkill,
    progressPercent: currentMastery?.masteryScore ?? 0,
  };
}

export async function getSkillWithLesson(skillId: string, studentId?: string) {
  const skill = await prisma.skill.findUniqueOrThrow({
    where: { id: skillId },
    include: {
      subject: true,
      level: true,
      lessons: true,
      videos: studentId
        ? { where: { approvedByParent: true } }
        : true,
      problems: { where: { approved: true }, take: 20 },
    },
  });

  const prerequisites = parseJsonArray<string>(skill.prerequisiteSkillIdsJson);
  let prereqSkills: { id: string; title: string }[] = [];
  if (prerequisites.length) {
    prereqSkills = await prisma.skill.findMany({
      where: { id: { in: prerequisites } },
      select: { id: true, title: true },
    });
  }

  return { ...skill, prereqSkills };
}

export async function getStudentByUserId(userId: string) {
  return prisma.studentProfile.findUnique({
    where: { userId },
  });
}

export async function getLevelMap(studentId: string, subjectId: string) {
  await normalizePlacementSkillId(studentId, subjectId);

  const levels = await prisma.level.findMany({
    where: { subjectId },
    include: {
      skills: { orderBy: { sequence: "asc" } },
    },
    orderBy: { sequence: "asc" },
  });

  const mastery = await prisma.masteryState.findMany({
    where: { studentId, skill: { subjectId } },
  });
  const masteryMap = new Map(mastery.map((m) => [m.skillId, m]));

  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
  });

  const completedSessions = await prisma.practiceSession.findMany({
    where: { studentId, sessionType: "PRACTICE", completed: true },
    select: { phaseJson: true },
  });
  const completedSkillIds = new Set(
    completedSessions
      .map((s) => {
        const skillId = (s.phaseJson as { primarySkillId?: string })?.primarySkillId;
        return skillId ? canonicalSkillId(skillId) : null;
      })
      .filter((id): id is string => Boolean(id)),
  );

  const currentId = placement?.currentSkillId
    ? canonicalSkillId(placement.currentSkillId)
    : null;

  function masteryForSkill(skillId: string) {
    const direct = masteryMap.get(skillId);
    if (direct) return direct;
    for (const legacyId of legacySkillIdsForCanonical(skillId)) {
      const legacy = masteryMap.get(legacyId);
      if (legacy) return legacy;
    }
    return undefined;
  }

  return levels.map((level) => ({
    ...level,
    skills: filterVisibleSkills(level.skills).map((skill) => {
      const mastery = masteryForSkill(skill.id);
      const isCurrent = skill.id === currentId;
      const unitPracticeComplete = completedSkillIds.has(skill.id);
      const hasStarted = Boolean(
        mastery?.attemptsCount ||
          unitPracticeComplete ||
          legacySkillIdsForCanonical(skill.id).some((id) => masteryMap.has(id)),
      );

      return {
        ...skill,
        mastery,
        isCurrent,
        unitPracticeComplete,
        statusLabel: unitStatusLabel({
          isCurrent,
          masteryStatus: mastery?.status,
          unitPracticeComplete,
          hasStarted,
        }),
      };
    }),
  }));
}
