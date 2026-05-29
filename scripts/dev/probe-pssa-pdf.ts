import { extractPdfText } from "../lib/pdf-text";
import { extractMcqBlocks } from "../state-releases/parsers/shared";

async function main() {
  const file = process.argv[2] ?? "data/state-releases/PA/test/g5-math-sampler.pdf";
  const text = await extractPdfText(file);
  console.log("len", text.length);
  console.log("--- sample ---");
  console.log(text.slice(0, 6000));
  const blocks = extractMcqBlocks(text);
  console.log("--- mcq blocks ---", blocks.length);
  if (blocks[0]) {
    console.log("first block prompt:", blocks[0].prompt.slice(0, 200));
    console.log("first choices:", blocks[0].choices);
  }
}

main().catch(console.error);
