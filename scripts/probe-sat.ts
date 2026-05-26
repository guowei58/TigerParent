import { extractPdfText } from "./lib/pdf-text";

async function main() {
  const test = await extractPdfText("data/imports/sat-practice-test-10.pdf");
  const ans = await extractPdfText("data/imports/sat-practice-test-10-answers.pdf");
  console.log("ANS sample:\n", ans.slice(0, 3000));
  console.log("\nTEST Reading section:\n", test.match(/Reading and Writing[\s\S]{0,2000}/)?.[0]);
}

main().catch(console.error);
