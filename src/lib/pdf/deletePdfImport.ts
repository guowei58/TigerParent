import fs from "fs";
import { prisma } from "@/lib/db";
import {
  pdfCropsDir,
  pdfPagesDir,
  resolveDataPath,
} from "@/lib/storage/fileStorage";

function tryDeletePath(storedPath: string | null | undefined) {
  if (!storedPath) return;
  try {
    const abs = resolveDataPath(storedPath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (error) {
    console.warn("Failed to delete file:", storedPath, error);
  }
}

function tryDeleteDir(dir: string) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn("Failed to delete directory:", dir, error);
  }
}

export async function deletePdfImportDocument(sourceDocumentId: string): Promise<{
  deleted: boolean;
  problemCount: number;
}> {
  const doc = await prisma.pdfSourceDocument.findUnique({
    where: { id: sourceDocumentId },
    select: {
      id: true,
      title: true,
      originalFilePath: true,
      pages: { select: { imagePath: true } },
      problems: {
        select: {
          problemImagePath: true,
          fullPageImagePath: true,
          choices: { select: { imagePath: true } },
        },
      },
      _count: { select: { problems: true } },
    },
  });

  if (!doc) {
    return { deleted: false, problemCount: 0 };
  }

  const problemCount = doc._count.problems;
  const filePaths = new Set<string>();

  filePaths.add(doc.originalFilePath);
  for (const page of doc.pages) {
    if (page.imagePath) filePaths.add(page.imagePath);
  }
  for (const problem of doc.problems) {
    if (problem.problemImagePath) filePaths.add(problem.problemImagePath);
    if (problem.fullPageImagePath) filePaths.add(problem.fullPageImagePath);
    for (const choice of problem.choices) {
      if (choice.imagePath) filePaths.add(choice.imagePath);
    }
  }

  await prisma.pdfSourceDocument.delete({ where: { id: sourceDocumentId } });

  for (const storedPath of filePaths) {
    tryDeletePath(storedPath);
  }
  tryDeleteDir(pdfPagesDir(sourceDocumentId));
  tryDeleteDir(pdfCropsDir(sourceDocumentId));

  return { deleted: true, problemCount };
}
