import { prisma } from "./db";
import type { Skill } from "@/generated/prisma/client";
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
  practiceHref: string;
};

function practiceTopicsHref(subjectName: string): string {
  const lower = subjectName.toLowerCase();
  if (lower.includes("english") || lower.includes("ela") || lower.includes("reading")) {
    return "/student/concepts?subject=english";
  }
  if (lower.includes("math")) {
    return "/student/concepts?subject=math";
  }
  return "/student/concepts";
}

async function practiceHrefForSubject(
  _studentId: string,
  _subjectId: string,
  subjectName: string,
  _currentSkillId: string | null,
): Promise<string> {
  return practiceTopicsHref(subjectName);
}

export async function getSubjectLearningCards(
  studentId: string,
): Promise<SubjectLearningCardData[]> {
  const { normalizePlacementSkillId } = await import("./skill-progression");

  const placements = await prisma.studentSubjectPlacement.findMany({
    where: {
      studentId,
      subject: { studentSubjects: { some: { studentId, enabled: true } } },
    },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  return Promise.all(
    placements.map(async (placement) => {
      await normalizePlacementSkillId(studentId, placement.subjectId);
      const practiceHref = await practiceHrefForSubject(
        studentId,
        placement.subjectId,
        placement.subject.name,
        placement.currentSkillId,
      );

      return {
        subjectId: placement.subjectId,
        subjectName: placement.subject.name,
        gradeLevel: placement.assessedGradeLevel,
        practiceHref,
      };
    }),
  );
}
