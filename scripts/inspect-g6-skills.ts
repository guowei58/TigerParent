import { prisma } from "../src/lib/db";

async function main() {
  const skills = await prisma.skill.findMany({
    where: { levelId: "math-level-6" },
    orderBy: { sequence: "asc" },
    select: {
      id: true,
      title: true,
      sequence: true,
      _count: { select: { problems: true } },
    },
  });
  console.log(JSON.stringify(skills, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
