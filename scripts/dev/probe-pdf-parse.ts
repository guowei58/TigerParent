import { extractPdfText } from "../lib/pdf-text";
import { extractMcqBlocks } from "../state-releases/parsers/shared";
function isParseableReleasePdf(localPath: string): boolean {
  const name = decodeURIComponent(localPath).toLowerCase();
  if (
    /glossary|scoring|handbook|guideline|formula sheet|accommodation|faq|report guide|cut score|reference sheet|dfa\.pdf|parent|spanish|french|compliant\.pdf|mapping.*naep/i.test(
      name,
    )
  ) {
    return false;
  }
  return /item.sampler|released.item|iss.*(math|ela)|released.test|practice.test|eog|leap|staar|mcas|pssa.*grade|answer.key|rationale/i.test(
    name,
  );
}

async function main() {
  const file =
    process.argv[2] ??
    "data/state-releases/WI/deep/2025-math-g5-Forward_Math_Practice_Test_Grade_5.pdf";
  console.log("parseable:", isParseableReleasePdf(file));
  const text = await extractPdfText(file);
  console.log("len", text.length);
  console.log(text.slice(0, 4000));
  const blocks = extractMcqBlocks(text);
  console.log("mcq blocks", blocks.length);
  if (blocks[0]) console.log("first", blocks[0].prompt.slice(0, 150), blocks[0].choices);
}

main().catch(console.error);
