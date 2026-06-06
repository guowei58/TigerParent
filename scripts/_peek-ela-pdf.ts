import { extractPdfTextByPage } from "../src/lib/pdf/extractPdfText";
import { getPdfPageCount } from "../src/lib/pdf/getPdfPageCount";

async function peek(rel: string, pages: number[]) {
  const path = rel;
  const total = await getPdfPageCount(path);
  console.log("\n===", rel, "pages:", total, "===");
  const texts = await extractPdfTextByPage(path);
  for (const n of pages) {
    const p = texts.find((x) => x.pageNumber === n);
    console.log("\n--- page", n, "---");
    console.log((p?.text ?? "").slice(0, 1500));
  }
}

async function main() {
  await peek("PracticeProblems/2025_grade3_ela_released_items_landscape.pdf", [1, 2, 3, 4, 5, 6, 7, 34, 35, 36]);
  await peek("PracticeProblems/2013_grade8_ela_sample_annotated_items_landscape.pdf", [1, 2, 3, 4, 5, 16, 17, 18, 19]);
}

main().catch(console.error);
