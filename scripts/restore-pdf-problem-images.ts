/**
 * Restore full-page PDF images for student display (undo whitespace trimming).
 * Usage: npx tsx --env-file=.env scripts/restore-pdf-problem-images.ts [--docId=...]
 */
import { prisma } from "../src/lib/db";
import { cropProblemImage } from "../src/lib/pdf/renderPdfPages";
import { resolveDataPath } from "../src/lib/storage/fileStorage";
import fs from "fs";
import sharp from "sharp";

async function main() {
  const docIdArg = process.argv.find((a) => a.startsWith("--docId="));
  const docId = docIdArg?.split("=")[1];

  const problems = await prisma.pdfPracticeProblem.findMany({
    where: docId ? { sourceDocumentId: docId } : undefined,
    select: {
      id: true,
      problemNumber: true,
      problemImagePath: true,
      fullPageImagePath: true,
    },
    orderBy: { problemNumber: "asc" },
  });

  let restored = 0;
  let skipped = 0;

  for (const p of problems) {
    if (!p.problemImagePath || !p.fullPageImagePath) {
      skipped++;
      continue;
    }

    const fullAbs = resolveDataPath(p.fullPageImagePath);
    if (!fs.existsSync(fullAbs)) {
      console.warn(`Missing full page: ${p.fullPageImagePath}`);
      skipped++;
      continue;
    }

    const fullMeta = await sharp(fullAbs).metadata();
    if (!fullMeta.width || !fullMeta.height) {
      skipped++;
      continue;
    }

    await cropProblemImage(p.fullPageImagePath, p.problemImagePath, {
      x: 0,
      y: 0,
      width: fullMeta.width,
      height: fullMeta.height,
    });

    await prisma.pdfPracticeProblem.update({
      where: { id: p.id },
      data: {
        cropX: 0,
        cropY: 0,
        cropWidth: fullMeta.width,
        cropHeight: fullMeta.height,
      },
    });

    console.log(`Problem ${p.problemNumber}: restored ${fullMeta.height}px full page`);
    restored++;
  }

  console.log(`Done. Restored ${restored}, skipped ${skipped}.`);
}

main().finally(() => prisma.$disconnect());
