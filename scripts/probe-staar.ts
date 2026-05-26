import { extractPdfText } from "./lib/pdf-text";

async function main() {
  const test = await extractPdfText("data/staar/2019-staar-5-math-test.pdf");
  const key = await extractPdfText("data/staar/2019-staar-5-math-key.pdf");
  console.log("TEST sample:\n", test.slice(2000, 5000));
  console.log("\nKEY full:\n", key);
}

main().catch(console.error);
