import { prisma } from "./db";

export async function studentNeedsOnboarding(studentId: string): Promise<boolean> {
  const settings = await prisma.studentSettings.findUnique({
    where: { studentId },
    select: { onboardingCompleted: true },
  });
  return !settings?.onboardingCompleted;
}

export async function initializeStudentPlacements(
  studentId: string,
  schoolGrade: number,
) {
  const subjects = await prisma.subject.findMany();

  for (const subject of subjects) {
    await prisma.studentSubject.upsert({
      where: {
        studentId_subjectId: { studentId, subjectId: subject.id },
      },
      update: { enabled: true },
      create: {
        studentId,
        subjectId: subject.id,
        enabled: true,
      },
    });

    const startLevel = await prisma.level.findFirst({
      where: { subjectId: subject.id, nominalGradeLevel: schoolGrade },
      include: { skills: { orderBy: { sequence: "asc" }, take: 1 } },
    });

    if (!startLevel?.skills[0]) continue;

    await prisma.studentSubjectPlacement.upsert({
      where: {
        studentId_subjectId: { studentId, subjectId: subject.id },
      },
      update: {
        schoolGrade,
        assessedGradeLevel: schoolGrade,
        currentLevelId: startLevel.id,
        currentSkillId: startLevel.skills[0].id,
        monthsAheadOrBehind: 0,
        lastUpdatedAt: new Date(),
      },
      create: {
        studentId,
        subjectId: subject.id,
        schoolGrade,
        assessedGradeLevel: schoolGrade,
        currentLevelId: startLevel.id,
        currentSkillId: startLevel.skills[0].id,
        monthsAheadOrBehind: 0,
      },
    });
  }
}

export async function completeStudentOnboarding(
  studentId: string,
  data: { displayName: string; schoolGrade: number },
) {
  const displayName = data.displayName.trim();
  const schoolGrade = Math.min(12, Math.max(1, Math.round(data.schoolGrade)));

  if (!displayName) {
    throw new Error("Name is required");
  }

  const student = await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      displayName,
      schoolGrade,
    },
    include: { user: true },
  });

  await prisma.user.update({
    where: { id: student.userId },
    data: { name: displayName },
  });

  await initializeStudentPlacements(studentId, schoolGrade);

  const firstSubject = await prisma.subject.findFirst({ orderBy: { name: "asc" } });

  await prisma.studentSettings.upsert({
    where: { studentId },
    update: {
      onboardingCompleted: true,
      activeSubjectId: firstSubject?.id,
    },
    create: {
      studentId,
      onboardingCompleted: true,
      activeSubjectId: firstSubject?.id,
    },
  });

  return student;
}
