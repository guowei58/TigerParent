import { prisma } from "./db";
import type { Skill } from "@/generated/prisma/client";
import { canonicalSkillId, filterVisibleSkills } from "./skill-catalog";

export async function getVisibleSkillsForLevel(
  levelId: string,
  subjectId: string,
): Promise<Skill[]> {
  const skills = await prisma.skill.findMany({
    where: { levelId, subjectId },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
  });
  return filterVisibleSkills(skills) as Skill[];
}

export async function getNextVisibleSkillInPlan(
  skillId: string,
): Promise<Skill | null> {
  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) return null;

  const visible = await getVisibleSkillsForLevel(skill.levelId, skill.subjectId);
  const index = visible.findIndex((s) => s.id === skill.id);
  if (index >= 0 && index < visible.length - 1) {
    return visible[index + 1];
  }

  const level = await prisma.level.findUniqueOrThrow({ where: { id: skill.levelId } });
  const nextLevel = await prisma.level.findFirst({
    where: {
      subjectId: skill.subjectId,
      sequence: { gt: level.sequence },
    },
    orderBy: { sequence: "asc" },
  });

  if (!nextLevel) return null;
  const nextLevelSkills = await getVisibleSkillsForLevel(nextLevel.id, skill.subjectId);
  return nextLevelSkills[0] ?? null;
}

export async function normalizePlacementSkillId(
  studentId: string,
  subjectId: string,
): Promise<string | null> {
  const placement = await prisma.studentSubjectPlacement.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
  });
  if (!placement?.currentSkillId) return null;

  const normalized = canonicalSkillId(placement.currentSkillId);
  if (normalized !== placement.currentSkillId) {
    await prisma.studentSubjectPlacement.update({
      where: { id: placement.id },
      data: { currentSkillId: normalized },
    });
  }
  return normalized;
}
