/**
 * Align PracticeConcept.gradeLevel with the grade on approved problems (fixes G3 PDFs under G5 taxonomy).
 * Run: npx tsx --env-file=.env scripts/sync-concept-grades-from-problems.ts
 */
import { prisma } from "../src/lib/db";

async function main() {
  const rows = await prisma.pdfPracticeProblem.groupBy({
    by: ["primaryConceptId", "gradeLevel"],
    where: {
      approvedForStudentUse: true,
      primaryConceptId: { not: null },
      gradeLevel: { not: null },
    },
    _count: { id: true },
  });

  const tally = new Map<string, Map<number, number>>();
  for (const row of rows) {
    if (!row.primaryConceptId || row.gradeLevel == null) continue;
    const perGrade = tally.get(row.primaryConceptId) ?? new Map<number, number>();
    perGrade.set(row.gradeLevel, (perGrade.get(row.gradeLevel) ?? 0) + row._count.id);
    tally.set(row.primaryConceptId, perGrade);
  }

  let updated = 0;
  for (const [conceptId, grades] of tally) {
    let bestGrade = 0;
    let bestCount = -1;
    for (const [grade, count] of grades) {
      if (count > bestCount) {
        bestCount = count;
        bestGrade = grade;
      }
    }
    if (bestGrade <= 0) continue;

    const concept = await prisma.practiceConcept.findUnique({
      where: { id: conceptId },
      select: { gradeLevel: true, name: true },
    });
    if (!concept || concept.gradeLevel === bestGrade) continue;

    await prisma.practiceConcept.update({
      where: { id: conceptId },
      data: { gradeLevel: bestGrade },
    });
    console.log(`  ${concept.name}: ${concept.gradeLevel ?? "?"} → ${bestGrade}`);
    updated++;
  }

  console.log(`Updated ${updated} concept grade level(s).`);
}

main().finally(() => prisma.$disconnect());
