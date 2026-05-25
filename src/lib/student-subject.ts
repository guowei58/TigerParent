import { prisma } from "./db";

export type StudentSubjectOption = {
  id: string;
  name: string;
  slug: string;
  currentSkillId: string | null;
  currentSkillTitle: string | null;
  assessedGradeLevel: number | null;
};

export async function getStudentSubjectOptions(
  studentId: string,
): Promise<StudentSubjectOption[]> {
  const [enabled, placements] = await Promise.all([
    prisma.studentSubject.findMany({
      where: { studentId, enabled: true },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.studentSubjectPlacement.findMany({
      where: { studentId },
      include: { currentSkill: true },
    }),
  ]);

  const placementBySubject = new Map(placements.map((p) => [p.subjectId, p]));

  return enabled.map((row) => {
    const placement = placementBySubject.get(row.subjectId);
    return {
      id: row.subject.id,
      name: row.subject.name,
      slug: row.subject.slug,
      currentSkillId: placement?.currentSkillId ?? null,
      currentSkillTitle: placement?.currentSkill?.title ?? null,
      assessedGradeLevel: placement?.assessedGradeLevel ?? null,
    };
  });
}

export async function getActiveSubjectId(studentId: string): Promise<string | null> {
  const settings = await prisma.studentSettings.findUnique({
    where: { studentId },
    select: { activeSubjectId: true },
  });
  if (settings?.activeSubjectId) return settings.activeSubjectId;

  const first = await prisma.studentSubject.findFirst({
    where: { studentId, enabled: true },
    orderBy: { subject: { name: "asc" } },
    select: { subjectId: true },
  });
  return first?.subjectId ?? null;
}

export async function setActiveSubjectId(studentId: string, subjectId: string) {
  const enabled = await prisma.studentSubject.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
  });
  if (!enabled?.enabled) {
    throw new Error("Subject not enabled for this student");
  }

  await prisma.studentSettings.upsert({
    where: { studentId },
    update: { activeSubjectId: subjectId },
    create: { studentId, activeSubjectId: subjectId },
  });
}

export async function getPlacementForSubject(studentId: string, subjectId: string) {
  return prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
    include: {
      subject: true,
      currentSkill: true,
      currentLevel: true,
    },
  });
}
