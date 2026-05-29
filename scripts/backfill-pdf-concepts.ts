import { prisma } from "../src/lib/db";
import { classifyProblemConcept } from "../src/lib/ai/classifyProblemConcept";

async function main() {
  const concepts = await prisma.practiceConcept.findMany({
    where: { subject: "math" },
    orderBy: { sortOrder: "asc" },
  });
  if (concepts.length === 0) {
    console.error("No practice concepts in DB. Run: npx tsx --env-file=.env scripts/seed-concepts.ts");
    process.exit(1);
  }

  const problems = await prisma.pdfPracticeProblem.findMany({
    where: { primaryConceptId: null },
    select: {
      id: true,
      problemNumber: true,
      cleanedText: true,
      rawText: true,
      gradeLevel: true,
    },
  });

  console.log(`Classifying ${problems.length} problems without a topic…`);

  let linked = 0;
  for (const p of problems) {
    const text = p.cleanedText ?? p.rawText ?? "";
    const classification = classifyProblemConcept(text, concepts, p.gradeLevel ?? 5);
    const concept = concepts.find((c) => c.slug === classification.primaryConceptSlug);
    if (!concept) continue;

    await prisma.pdfPracticeProblem.update({
      where: { id: p.id },
      data: {
        primaryConceptId: concept.id,
        topic: classification.topic,
        subtopic: classification.subtopic,
        conceptConfidence: classification.classificationConfidence,
      },
    });
    await prisma.pdfProblemConcept.upsert({
      where: { problemId_conceptId: { problemId: p.id, conceptId: concept.id } },
      create: {
        problemId: p.id,
        conceptId: concept.id,
        isPrimary: true,
        confidence: classification.classificationConfidence,
        classificationMethod: "ai",
        reasoning: classification.reasoning,
      },
      update: {
        isPrimary: true,
        confidence: classification.classificationConfidence,
        reasoning: classification.reasoning,
      },
    });
    linked++;
  }

  const withConcept = await prisma.pdfPracticeProblem.count({
    where: { approvedForStudentUse: true, primaryConceptId: { not: null } },
  });
  console.log(`Linked ${linked} problems. Approved with topic: ${withConcept}`);
}

main().finally(() => prisma.$disconnect());
