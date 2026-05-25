/**
 * Deactivate legacy duplicate skills and fix student placements.
 * Run: npm run db:dedupe-skills
 */
import { prisma } from "../src/lib/db";
import { LEGACY_SKILL_REDIRECT, isLegacySkillId } from "../src/lib/skill-catalog";

async function main() {
  const legacyIds = Object.keys(LEGACY_SKILL_REDIRECT);
  console.log(`Fixing ${legacyIds.length} legacy skill mappings...`);

  await prisma.problem.updateMany({
    where: { skillId: { in: legacyIds } },
    data: {
      isActive: false,
      studentReady: false,
      canShowToStudent: false,
      approved: false,
      reviewStatus: "RETIRED",
    },
  });

  const placements = await prisma.studentSubjectPlacement.findMany({
    where: { currentSkillId: { in: legacyIds } },
  });

  for (const placement of placements) {
    const target = LEGACY_SKILL_REDIRECT[placement.currentSkillId!];
    if (!target) continue;
    await prisma.studentSubjectPlacement.update({
      where: { id: placement.id },
      data: { currentSkillId: target },
    });
    console.log(`Moved placement ${placement.id}: ${placement.currentSkillId} → ${target}`);
  }

  const inProgressSessions = await prisma.practiceSession.findMany({
    where: { completed: false, sessionType: "PRACTICE" },
  });

  for (const session of inProgressSessions) {
    const phase = (session.phaseJson ?? {}) as { primarySkillId?: string };
    if (phase.primarySkillId && isLegacySkillId(phase.primarySkillId)) {
      const target = LEGACY_SKILL_REDIRECT[phase.primarySkillId];
      if (target) {
        await prisma.practiceSession.update({
          where: { id: session.id },
          data: {
            phaseJson: { ...phase, primarySkillId: target },
          },
        });
      }
    }
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
