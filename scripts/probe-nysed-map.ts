import { extractPdfText } from "./lib/pdf-text";

async function main() {
  const text = await extractPdfText("data/imports/nysed-2024-math-g3.pdf");
  console.log("Session1 idx", text.indexOf("Session 1"));
  console.log("Map idx", text.indexOf("Map to the Standards"));
  console.log(text.slice(8000, 12000));
}

main().catch(console.error);
