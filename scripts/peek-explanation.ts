import { prisma } from "../src/lib/db";

async function main() {
  const p = await prisma.pdfPracticeProblem.findFirst({
    where: { sourceDocument: { title: "test" }, problemNumber: 1 },
    include: { solution: true },
  });
  console.log(p?.solution?.explanationStepByStep?.slice(0, 500));
}

main().finally(() => prisma.$disconnect());
