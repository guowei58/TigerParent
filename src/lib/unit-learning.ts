import { prisma } from "./db";
import type { Skill } from "@/generated/prisma/client";
import type { MistakeDayGroup } from "./review";
import { getNextVisibleSkillInPlan } from "./skill-progression";

type PhaseJson = {
  primarySkillId?: string;
  questionIds?: string[];
};

export async function getNextSkillInPlan(skillId: string): Promise<Skill | null> {
  return getNextVisibleSkillInPlan(skillId);
}

export async function findInProgressPracticeSession(
  studentId: string,
  skillId: string,
) {
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      sessionType: "PRACTICE",
      completed: false,
    },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return (
    sessions.find((session) => {
      const phase = (session.phaseJson ?? {}) as PhaseJson;
      return phase.primarySkillId === skillId && (phase.questionIds?.length ?? 0) > 0;
    }) ?? null
  );
}

export async function getOrCreateSkillPracticeSession(
  studentId: string,
  skillId: string,
) {
  const existing = await findInProgressPracticeSession(studentId, skillId);
  if (existing) return existing;

  const sessionRecord = await prisma.practiceSession.create({
    data: {
      studentId,
      sessionType: "PRACTICE",
      targetMinutes: 15,
      phaseJson: { primarySkillId: skillId, questionIds: [] },
    },
  });

  const { selectFreshProblemsForStudent } = await import("./problem-selection");
  const freshProblems = await selectFreshProblemsForStudent({
    studentId,
    skillId,
    count: 10,
    sessionId: sessionRecord.id,
    recordExposure: true,
  });

  return prisma.practiceSession.update({
    where: { id: sessionRecord.id },
    data: {
      phaseJson: {
        primarySkillId: skillId,
        questionIds: freshProblems.map((p) => p.id),
      },
    },
  });
}

/** Move the lesson-plan pointer to the next unit after finishing practice. */
export async function advanceLessonPlanAfterUnit(
  studentId: string,
  skillId: string,
) {
  const placement = await prisma.studentSubjectPlacement.findFirst({
    where: { studentId, currentSkillId: skillId },
  });
  if (!placement) return null;

  const skill = await prisma.skill.findUniqueOrThrow({ where: { id: skillId } });
  const { advanceToNextSkill } = await import("./mastery");
  return advanceToNextSkill(studentId, skill);
}

export async function getContinueLearningState(
  studentId: string,
  subjectId: string | null,
) {
  if (!subjectId) {
    return { currentSkill: null, nextSkill: null, practiceSessionId: null, subjectName: null };
  }

  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
    include: { currentSkill: true, subject: true },
  });

  if (!placement?.currentSkill) {
    return { currentSkill: null, nextSkill: null, practiceSessionId: null, subjectName: null };
  }

  const [nextSkill, inProgress] = await Promise.all([
    getNextSkillInPlan(placement.currentSkillId!),
    findInProgressPracticeSession(studentId, placement.currentSkillId!),
  ]);

  return {
    currentSkill: placement.currentSkill,
    subjectName: placement.subject.name,
    nextSkill,
    practiceSessionId: inProgress?.id ?? null,
  };
}

export type SubjectLearningCardData = {
  subjectId: string;
  subjectName: string;
  gradeLevel: number;
  monthsAheadOrBehind: number;
  currentSkill: { id: string; title: string } | null;
  nextSkill: { id: string; title: string } | null;
  practiceSessionId: string | null;
  progressPercent: number;
  mistakeDays: MistakeDayGroup[];
  mistakeCount: number;
};

export async function getSubjectLearningCards(
  studentId: string,
): Promise<SubjectLearningCardData[]> {
  const { canonicalSkillId, legacySkillIdsForCanonical } = await import("./skill-catalog");
  const { normalizePlacementSkillId } = await import("./skill-progression");
  const { getMistakeDayGroups, countUnreviewedMistakes } = await import("./review");

  const [placements, masteryStates] = await Promise.all([
    prisma.studentSubjectPlacement.findMany({
      where: {
        studentId,
        subject: { studentSubjects: { some: { studentId, enabled: true } } },
      },
      include: { subject: true, currentSkill: { select: { id: true, title: true } } },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.masteryState.findMany({
      where: { studentId },
      select: { skillId: true, masteryScore: true },
    }),
  ]);

  const masteryMap = new Map(masteryStates.map((m) => [m.skillId, m.masteryScore]));

  function masteryForSkill(skillId: string): number {
    const direct = masteryMap.get(skillId);
    if (direct != null) return direct;
    for (const legacyId of legacySkillIdsForCanonical(canonicalSkillId(skillId))) {
      const legacy = masteryMap.get(legacyId);
      if (legacy != null) return legacy;
    }
    return 0;
  }

  return Promise.all(
    placements.map(async (placement) => {
      await normalizePlacementSkillId(studentId, placement.subjectId);
      const [continueState, mistakeDays] = await Promise.all([
        getContinueLearningState(studentId, placement.subjectId),
        getMistakeDayGroups(studentId, placement.subjectId),
      ]);
      const currentSkill = continueState.currentSkill;

      return {
        subjectId: placement.subjectId,
        subjectName: placement.subject.name,
        gradeLevel: placement.assessedGradeLevel,
        monthsAheadOrBehind: placement.monthsAheadOrBehind,
        currentSkill: currentSkill
          ? { id: currentSkill.id, title: currentSkill.title }
          : null,
        nextSkill: continueState.nextSkill
          ? { id: continueState.nextSkill.id, title: continueState.nextSkill.title }
          : null,
        practiceSessionId: continueState.practiceSessionId,
        progressPercent: currentSkill ? masteryForSkill(currentSkill.id) : 0,
        mistakeDays,
        mistakeCount: countUnreviewedMistakes(mistakeDays),
      };
    }),
  );
}
