/**
 * Report question bank composition by source, grade, skill, usage type.
 */
import { prisma } from "@/lib/db";

async function main() {
  const total = await prisma.problem.count();
  const studentReady = await prisma.problem.count({ where: { studentReady: true } });

  console.log("\n=== TigerParent Question Bank Composition ===\n");
  console.log(`Total problems: ${total.toLocaleString()}`);
  console.log(`Student-ready:  ${studentReady.toLocaleString()}\n`);

  console.log("--- By Content Source ---");
  const bySource = await prisma.problem.groupBy({
    by: ["sourceId", "sourceName"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  for (const row of bySource) {
    console.log(
      `  ${(row.sourceName ?? row.sourceId ?? "unknown").padEnd(40)} ${row._count.id.toLocaleString().padStart(8)}`,
    );
  }

  console.log("\n--- By Content Class ---");
  const byClass = await prisma.problem.groupBy({
    by: ["contentClass"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  for (const row of byClass) {
    console.log(`  ${String(row.contentClass).padEnd(25)} ${row._count.id.toLocaleString().padStart(8)}`);
  }

  console.log("\n--- By Usage Type ---");
  const byUsage = await prisma.problem.groupBy({
    by: ["usageType"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  for (const row of byUsage) {
    console.log(`  ${String(row.usageType).padEnd(25)} ${row._count.id.toLocaleString().padStart(8)}`);
  }

  console.log("\n--- By Grade Level ---");
  const byGrade = await prisma.problem.groupBy({
    by: ["gradeLevel"],
    _count: { id: true },
    orderBy: { gradeLevel: "asc" },
  });
  for (const row of byGrade) {
    console.log(`  Grade ${String(row.gradeLevel).padStart(2)}  ${row._count.id.toLocaleString().padStart(8)}`);
  }

  console.log("\n--- By Subject ---");
  const subjects = await prisma.subject.findMany();
  for (const subj of subjects) {
    const count = await prisma.problem.count({ where: { subjectId: subj.id } });
    console.log(`  ${subj.name.padEnd(20)} ${count.toLocaleString().padStart(8)}`);
  }

  console.log("\n--- Top 30 Skills (by problem count) ---");
  const bySkill = await prisma.problem.groupBy({
    by: ["skillId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 30,
  });
  const skills = await prisma.skill.findMany({
    where: { id: { in: bySkill.map((s) => s.skillId) } },
    select: { id: true, title: true, nominalGradeLevel: true },
  });
  const skillMap = new Map(skills.map((s) => [s.id, s]));
  for (const row of bySkill) {
    const sk = skillMap.get(row.skillId);
    const label = sk ? `G${sk.nominalGradeLevel ?? "?"} ${sk.title}` : row.skillId;
    console.log(`  ${label.padEnd(45)} ${row._count.id.toLocaleString().padStart(8)}`);
  }

  console.log("\n--- Imported vs Generated ---");
  const generated = await prisma.problem.count({
    where: { OR: [{ sourceId: "tigerparent-generated" }, { contentClass: "GENERATED" }] },
  });
  const official = await prisma.problem.count({
    where: { contentClass: "OFFICIAL_RELEASED" },
  });
  const oer = await prisma.problem.count({
    where: { contentClass: "LICENSED_OR_OER", sourceId: { not: "tigerparent-generated" } },
  });
  console.log(`  Generated (fluency drills)     ${generated.toLocaleString().padStart(8)}`);
  console.log(`  Official released              ${official.toLocaleString().padStart(8)}`);
  console.log(`  OER / licensed                 ${oer.toLocaleString().padStart(8)}`);

  console.log("\n--- Benchmark-eligible (HIGH confidence, official/OER, approved) ---");
  const benchmarkEligible = await prisma.problem.count({
    where: {
      studentReady: true,
      approved: true,
      confidenceLevel: "HIGH",
      usageType: {
        in: [
          "OFFICIAL_RELEASED",
          "STAAR_PRACTICE",
          "SAT_PRACTICE",
          "SCHOOL_TEST_PREP",
          "BENCHMARK",
        ],
      },
    },
  });
  console.log(`  ${benchmarkEligible.toLocaleString()} problems`);
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
