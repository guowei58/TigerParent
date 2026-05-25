import { prisma } from "./db";
import { selectFreshProblemsForStudent } from "./problem-selection";
import { parseJsonArray } from "./utils";
import type { PopQuizStatus } from "@/generated/prisma/client";
import { popQuizProblemCount } from "./pop-quiz-utils";

export { popQuizProblemCount };

export type PendingPopQuiz = {
  id: string;
  title: string | null;
  status: PopQuizStatus;
  sessionId: string | null;
  skillIds: string[];
  skillTitles: string[];
  problemCount: number;
  createdAt: Date;
};

export async function assertParentOwnsStudent(
  familyId: string | null | undefined,
  studentId: string,
  role: string,
) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { id: true, familyId: true, displayName: true },
  });
  if (!student) return null;
  if (role === "ADMIN") return student;
  if (role !== "PARENT" || !familyId || student.familyId !== familyId) return null;
  return student;
}

export async function getPendingPopQuiz(
  studentId: string,
): Promise<PendingPopQuiz | null> {
  const assignment = await prisma.popQuizAssignment.findFirst({
    where: {
      studentId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!assignment) return null;

  const skillIds = parseJsonArray<string>(assignment.skillIdsJson);
  const skills = skillIds.length
    ? await prisma.skill.findMany({
        where: { id: { in: skillIds } },
        select: { id: true, title: true },
      })
    : [];

  const titleById = new Map(skills.map((s) => [s.id, s.title]));

  return {
    id: assignment.id,
    title: assignment.title,
    status: assignment.status,
    sessionId: assignment.sessionId,
    skillIds,
    skillTitles: skillIds.map((id) => titleById.get(id) ?? id),
    problemCount: assignment.problemCount,
    createdAt: assignment.createdAt,
  };
}

export async function createPopQuizAssignment(input: {
  studentId: string;
  createdByUserId: string;
  skillIds: string[];
  title?: string;
}) {
  const uniqueSkillIds = [...new Set(input.skillIds.filter(Boolean))];
  if (!uniqueSkillIds.length) {
    throw new Error("Select at least one lesson");
  }

  const existing = await getPendingPopQuiz(input.studentId);
  if (existing) {
    throw new Error("This student already has a pop quiz waiting. Cancel it first or wait until they finish.");
  }

  const skills = await prisma.skill.findMany({
    where: { id: { in: uniqueSkillIds } },
    select: { id: true, title: true, subject: { select: { name: true } } },
  });
  if (skills.length !== uniqueSkillIds.length) {
    throw new Error("One or more selected lessons are invalid");
  }

  const title =
    input.title?.trim() ||
    `Pop Quiz — ${skills.map((s) => s.title).slice(0, 3).join(", ")}${skills.length > 3 ? "…" : ""}`;

  return prisma.popQuizAssignment.create({
    data: {
      studentId: input.studentId,
      createdByUserId: input.createdByUserId,
      title,
      skillIdsJson: uniqueSkillIds,
      problemCount: popQuizProblemCount(uniqueSkillIds.length),
      status: "PENDING",
    },
  });
}

export async function startPopQuizSession(studentId: string, assignmentId: string) {
  const assignment = await prisma.popQuizAssignment.findFirst({
    where: {
      id: assignmentId,
      studentId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
  if (!assignment) return null;

  if (assignment.sessionId) {
    const existing = await prisma.practiceSession.findUnique({
      where: { id: assignment.sessionId },
    });
    if (existing && !existing.completed) return existing;
  }

  const skillIds = parseJsonArray<string>(assignment.skillIdsJson);
  const sessionRecord = await prisma.practiceSession.create({
    data: {
      studentId,
      sessionType: "POP_QUIZ",
      targetMinutes: 20,
      phaseJson: {
        popQuizAssignmentId: assignment.id,
        skillIds,
        questionIds: [],
      },
    },
  });

  const problems = await selectFreshProblemsForStudent({
    studentId,
    skillIds,
    count: assignment.problemCount,
    sessionId: sessionRecord.id,
    sessionType: "POP_QUIZ",
    recordExposure: true,
  });

  const updatedSession = await prisma.practiceSession.update({
    where: { id: sessionRecord.id },
    data: {
      phaseJson: {
        popQuizAssignmentId: assignment.id,
        skillIds,
        questionIds: problems.map((p) => p.id),
      },
    },
  });

  await prisma.popQuizAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "IN_PROGRESS",
      sessionId: updatedSession.id,
    },
  });

  return updatedSession;
}

export async function completePopQuizAssignment(sessionId: string) {
  const assignment = await prisma.popQuizAssignment.findFirst({
    where: { sessionId },
  });
  if (!assignment || assignment.status === "COMPLETED") return assignment;

  return prisma.popQuizAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
}

export async function cancelPopQuizAssignment(
  studentId: string,
  assignmentId: string,
) {
  const assignment = await prisma.popQuizAssignment.findFirst({
    where: {
      id: assignmentId,
      studentId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
  if (!assignment) return null;

  if (assignment.sessionId) {
    await prisma.practiceSession.updateMany({
      where: { id: assignment.sessionId, completed: false },
      data: { completed: true, endedAt: new Date() },
    });
  }

  return prisma.popQuizAssignment.update({
    where: { id: assignment.id },
    data: { status: "CANCELLED" },
  });
}

export async function getPopQuizSkillsForStudent(studentId: string) {
  const enabledSubjects = await prisma.studentSubject.findMany({
    where: { studentId, enabled: true },
    include: {
      subject: {
        include: {
          levels: {
            orderBy: { sequence: "asc" },
            include: {
              skills: { orderBy: { sequence: "asc" } },
            },
          },
        },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  const { filterVisibleSkills } = await import("./skill-catalog");

  return enabledSubjects.map(({ subject }) => ({
    subjectId: subject.id,
    subjectName: subject.name,
    skills: subject.levels.flatMap((level) =>
      filterVisibleSkills(level.skills).map((skill) => ({
        id: skill.id,
        title: skill.title,
        levelTitle: level.title,
        grade: level.nominalGradeLevel,
      })),
    ),
  }));
}
