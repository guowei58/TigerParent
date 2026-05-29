import { renderPdfPages } from "../src/lib/pdf/renderPdfPages";

async function main() {
  const pdf = process.argv[2] ?? "data/pdf-uploads/9a49fcbe70614d42-3rd_grade_math_-_NY_1_.pdf";
  const pages = await renderPdfPages(pdf, "data/pdf-pages/test-render", 1.5);
  console.log("ok pages", pages.length, pages[0]?.imagePath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
