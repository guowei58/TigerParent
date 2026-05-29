import { prisma } from "../src/lib/db";
import { listConceptSections } from "../src/lib/pdf-practice/selection";

async function main() {
  const approved = await prisma.pdfPracticeProblem.count({
    where: { approvedForStudentUse: true },
  });
  const total = await prisma.pdfPracticeProblem.count();
  const needsReview = await prisma.pdfPracticeProblem.count({
    where: { approvedForStudentUse: false },
  });

  const docs = await prisma.pdfSourceDocument.findMany({
    select: {
      title: true,
      importStatus: true,
      _count: {
        select: {
          problems: true,
        },
      },
    },
  });

  const approvedList = await prisma.pdfPracticeProblem.findMany({
    where: { approvedForStudentUse: true },
    select: {
      problemNumber: true,
      primaryConceptId: true,
      primaryConcept: { select: { name: true, slug: true } },
      sourceDocument: { select: { title: true } },
    },
    take: 20,
  });

  const sections = await listConceptSections(5, "math");
  const withProblems = sections.filter((s) => s.approvedProblemCount > 0);

  console.log("=== PDF pipeline status ===");
  console.log(`Total problems in DB: ${total}`);
  console.log(`Approved for students: ${approved}`);
  console.log(`Still need admin approve: ${needsReview}`);
  console.log("\nDocuments:");
  for (const d of docs) {
    console.log(`  - ${d.title} (${d.importStatus}) · ${d._count.problems} problems`);
  }
  console.log("\nConcept sections with approved problems (grade 5 math):", withProblems.length);
  for (const s of withProblems) {
    console.log(`  - ${s.name}: ${s.approvedProblemCount}`);
  }
  if (approvedList.length) {
    console.log("\nSample approved problems:");
    for (const p of approvedList) {
      console.log(
        `  #${p.problemNumber} ${p.sourceDocument.title} · concept: ${p.primaryConcept?.name ?? "NONE"}`,
      );
    }
  }
}

main().finally(() => prisma.$disconnect());
