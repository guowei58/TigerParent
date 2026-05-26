import { prisma } from "@/lib/db";

async function main() {
  console.log("\n--- Imported Problems by Source × Grade ---");
  const rows = await prisma.problem.groupBy({
    by: ["sourceId", "gradeLevel"],
    where: { sourceId: { not: "tigerparent-generated" } },
    _count: { id: true },
    orderBy: [{ sourceId: "asc" }, { gradeLevel: "asc" }],
  });
  for (const r of rows) {
    console.log(`  ${(r.sourceId ?? "?").padEnd(28)} G${String(r.gradeLevel).padStart(2)}  ${r._count.id}`);
  }

  console.log("\n--- Imported by Skill (top 20, non-generated) ---");
  const bySkill = await prisma.problem.groupBy({
    by: ["skillId"],
    where: { sourceId: { not: "tigerparent-generated" } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });
  const skills = await prisma.skill.findMany({
    where: { id: { in: bySkill.map((s) => s.skillId) } },
    select: { id: true, title: true, nominalGradeLevel: true },
  });
  const sm = new Map(skills.map((s) => [s.id, s]));
  for (const r of bySkill) {
    const sk = sm.get(r.skillId);
    console.log(`  ${(sk ? `G${sk.nominalGradeLevel} ${sk.title}` : r.skillId).padEnd(42)} ${r._count.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
