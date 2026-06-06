import { extractPdfTextByPage } from "../src/lib/pdf/extractPdfText";
import { detectElaReadingProblems } from "../src/lib/pdf/detectElaReading";

async function test(path: string, answerKeyPages: number) {
  const pages = await extractPdfTextByPage(path);
  const result = detectElaReadingProblems(pages, answerKeyPages);
  console.log("\n===", path.split(/[/\\]/).pop(), "===");
  console.log("Passages:", result.passages.length);
  for (const p of result.passages) {
    console.log(
      `  #${p.passageNumber} pages ${p.pageStart}-${p.pageEnd} Q${p.questionRangeStart ?? "?"}-${p.questionRangeEnd ?? "?"} title=${p.title?.slice(0, 40) ?? "—"}`,
    );
  }
  console.log("Questions:", result.regions.length);
  for (const r of result.regions.slice(0, 12)) {
    console.log(
      `  Q${r.problemNumber} p${r.pageNumber} ${r.questionType} passage=${(r as { passageNumber?: number }).passageNumber ?? "—"} ${r.cleanedText.slice(0, 60)}…`,
    );
  }
  if (result.regions.length > 12) console.log(`  … +${result.regions.length - 12} more`);
}

async function main() {
  await test("PracticeProblems/2025_grade3_ela_released_items_landscape.pdf", 1);
  await test("PracticeProblems/2013_grade8_ela_sample_annotated_items_landscape.pdf", 1);
}

main().catch(console.error);
