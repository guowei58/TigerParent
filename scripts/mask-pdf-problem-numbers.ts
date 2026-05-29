/**
 * Mask the first problem number on each student problem image using PDF text positions.
 * Usage: npx tsx --env-file=.env scripts/mask-pdf-problem-numbers.ts [--docId=...]
 */
import { prisma } from "../src/lib/db";
const PDF_RENDER_SCALE = 1.5;
import { cropProblemImage } from "../src/lib/pdf/renderPdfPages";
import { maskFirstProblemNumberOnImage } from "../src/lib/pdf/maskProblemNumber";
import { resolveDataPath } from "../src/lib/storage/fileStorage";
import fs from "fs";
import sharp from "sharp";

async function main() {
  const docIdArg = process.argv.find((a) => a.startsWith("--docId="));
  const docId = docIdArg?.split("=")[1];

  const docs = await prisma.pdfSourceDocument.findMany({
    where: docId ? { id: docId } : undefined,
    select: {
      id: true,
      title: true,
      originalFilePath: true,
      problems: {
        select: {
          id: true,
          problemNumber: true,
          sourcePageStart: true,
          problemImagePath: true,
          fullPageImagePath: true,
        },
        orderBy: { problemNumber: "asc" },
      },
    },
  });

  let masked = 0;
  let failed = 0;

  for (const doc of docs) {
    if (!fs.existsSync(doc.originalFilePath)) {
      console.warn(`Skip ${doc.title}: PDF not found`);
      continue;
    }

    console.log(`\n${doc.title} (${doc.problems.length} problems)`);

    for (const p of doc.problems) {
      if (!p.problemImagePath || !p.fullPageImagePath) {
        failed++;
        continue;
      }

      const fullAbs = resolveDataPath(p.fullPageImagePath);
      if (!fs.existsSync(fullAbs)) {
        console.warn(`  #${p.problemNumber}: missing full page`);
        failed++;
        continue;
      }

      const fullMeta = await sharp(fullAbs).metadata();
      if (!fullMeta.width || !fullMeta.height) {
        failed++;
        continue;
      }

      await cropProblemImage(p.fullPageImagePath, p.problemImagePath, {
        x: 0,
        y: 0,
        width: fullMeta.width,
        height: fullMeta.height,
      });

      const result = await maskFirstProblemNumberOnImage(
        p.problemImagePath,
        doc.originalFilePath,
        p.sourcePageStart,
        PDF_RENDER_SCALE,
      );

      if (result.masked) {
        console.log(
          `  #${p.problemNumber}: masked at (${result.rect?.left}, ${result.rect?.top}) ${result.rect?.width}x${result.rect?.height}`,
        );
        masked++;
      } else {
        console.warn(`  #${p.problemNumber}: no number found`);
        failed++;
      }
    }
  }

  console.log(`\nDone. Masked ${masked}, could not mask ${failed}.`);
}

main().finally(() => prisma.$disconnect());
