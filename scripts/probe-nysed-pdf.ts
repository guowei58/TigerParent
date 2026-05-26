import { extractPdfText } from "./lib/pdf-text";

async function main() {
  const file = process.argv[2] ?? "data/imports/nysed-2024-math-g5.pdf";
  const text = await extractPdfText(file);
  console.log("File:", file, "Length:", text.length);
  const mapIdx = text.indexOf("Question");
  console.log(text.slice(mapIdx, mapIdx + 6000));
}

main().catch(console.error);
