/**
 * Re-trim blank margins on existing PDF problem images (in-place).
 * Usage: npx tsx --env-file=.env scripts/trim-pdf-problem-images.ts [--docId=...]
 */
import { prisma } from "../src/lib/db";
import { cropProblemImage, trimImageWhitespace } from "../src/lib/pdf/renderPdfPages";
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
      cropWidth: true,
      cropHeight: true,
    },
    orderBy: { problemNumber: "asc" },
  });

  let trimmed = 0;
  let skipped = 0;

  for (const p of problems) {
    if (!p.problemImagePath) {
      skipped++;
      continue;
    }
    const abs = resolveDataPath(p.problemImagePath);
    if (!fs.existsSync(abs)) {
      console.warn(`Missing file: ${p.problemImagePath}`);
      skipped++;
      continue;
    }

    if (p.fullPageImagePath && fs.existsSync(resolveDataPath(p.fullPageImagePath))) {
      const fullMeta = await sharp(resolveDataPath(p.fullPageImagePath)).metadata();
      if (fullMeta.width && fullMeta.height) {
        await cropProblemImage(p.fullPageImagePath, p.problemImagePath, {
          x: 0,
          y: 0,
          width: fullMeta.width,
          height: fullMeta.height,
        });
      }
    }

    const beforeMeta = await sharp(abs).metadata();
    const result = await trimImageWhitespace(p.problemImagePath);
    if (result.trimmed) {
      await prisma.pdfPracticeProblem.update({
        where: { id: p.id },
        data: { cropWidth: result.width, cropHeight: result.height },
      });
      console.log(
        `Problem ${p.problemNumber}: ${beforeMeta.height}→${result.height}px height`,
      );
      trimmed++;
    } else {
      skipped++;
    }
  }

  console.log(`Done. Trimmed ${trimmed}, unchanged ${skipped}.`);
}

main().finally(() => prisma.$disconnect());
