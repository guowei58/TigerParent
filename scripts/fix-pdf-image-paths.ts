/**
 * Normalize legacy absolute image paths to data-relative paths.
 */
import { prisma } from "../src/lib/db";
import { toDataRelativePath } from "../src/lib/storage/fileStorage";

async function main() {
  const problems = await prisma.pdfPracticeProblem.findMany({
    select: { id: true, problemImagePath: true, fullPageImagePath: true },
  });
  let updated = 0;
  for (const p of problems) {
    const problemImagePath = p.problemImagePath
      ? toDataRelativePath(p.problemImagePath)
      : null;
    const fullPageImagePath = p.fullPageImagePath
      ? toDataRelativePath(p.fullPageImagePath)
      : null;
    if (
      problemImagePath === p.problemImagePath &&
      fullPageImagePath === p.fullPageImagePath
    ) {
      continue;
    }
    await prisma.pdfPracticeProblem.update({
      where: { id: p.id },
      data: { problemImagePath, fullPageImagePath },
    });
    updated++;
  }

  const pages = await prisma.pdfPage.findMany({ select: { id: true, imagePath: true } });
  for (const pg of pages) {
    const imagePath = toDataRelativePath(pg.imagePath);
    if (imagePath === pg.imagePath) continue;
    await prisma.pdfPage.update({ where: { id: pg.id }, data: { imagePath } });
    updated++;
  }

  console.log("normalized paths:", updated);
}

main().finally(() => prisma.$disconnect());
