import { prisma } from "../src/lib/db";
import {
  MATH_CURRICULUM,
  ENGLISH_CURRICULUM,
  skillKey,
} from "./curriculum-data";
import { getLearningResourcesForSkill } from "../src/lib/learning-library";

async function seedVideosForSubject(
  subjectSlug: string,
  curriculum: typeof MATH_CURRICULUM,
) {
  let count = 0;
  for (const levelDef of curriculum) {
    for (let si = 0; si < levelDef.skills.length; si++) {
      const skillDef = levelDef.skills[si];
      const id = skillKey(subjectSlug, levelDef.grade, skillDef.title);
      const skill = await prisma.skill.findUnique({ where: { id } });
      if (!skill) continue;

      await prisma.videoResource.deleteMany({ where: { skillId: skill.id } });

      const resources = getLearningResourcesForSkill(skillDef.title);
      for (let vi = 0; vi < resources.length; vi++) {
        const r = resources[vi];
        await prisma.videoResource.create({
          data: {
            id: `${id}-video-${vi + 1}`,
            skillId: skill.id,
            title: r.title,
            provider: r.provider,
            url: r.url,
            durationSeconds: r.durationSeconds ?? 480,
            gradeLevel: levelDef.grade,
            tagsJson: [skillDef.title, subjectSlug],
            approvedByParent: true,
            notes: "Curated learning resource",
          },
        });
        count++;
      }
    }
  }
  return count;
}

async function main() {
  console.log("Seeding learning library videos...");
  const math = await seedVideosForSubject("math", MATH_CURRICULUM);
  const english = await seedVideosForSubject("english", ENGLISH_CURRICULUM);
  console.log(`Done. ${math + english} video links (${math} math, ${english} english).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
