import { prisma } from "../src/lib/db";

const docId = process.argv[2] ?? "cmpnhm83100001svmscgl00hp";

async function main() {
  const doc = await prisma.pdfSourceDocument.findUnique({
    where: { id: docId },
    include: {
      ingestionJobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!doc) {
    console.log("DOC_NOT_FOUND");
    return;
  }
  const pageCount = await prisma.pdfPage.count({ where: { sourceDocumentId: doc.id } });
  const problemCount = await prisma.pdfPracticeProblem.count({
    where: { sourceDocumentId: doc.id },
  });
  console.log(
    JSON.stringify(
      {
        id: doc.id,
        title: doc.title,
        originalFilePath: doc.originalFilePath,
        importStatus: doc.importStatus,
        pageCountField: doc.pageCount,
        dbPages: pageCount,
        dbProblems: problemCount,
        dbAnswerKeys: await prisma.pdfAnswerKeyEntry.count({
          where: { sourceDocumentId: doc.id },
        }),
        ingestionLayout: doc.ingestionLayout,
        answerKeyPageCount: doc.answerKeyPageCount,
        jobs: doc.ingestionJobs.map((j) => ({
          id: j.id,
          status: j.status,
          currentStep: j.currentStep,
          errorMessage: j.errorMessage,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
        })),
      },
      null,
      2,
    ),
  );
}

main().finally(() => prisma.$disconnect());
