import assert from "node:assert/strict";
import {
  classifyReexamineReviewTier,
  mergeReexamineTierWarning,
  parseReexamineReviewTier,
} from "@/lib/pdf/reexamineReviewTier";

assert.equal(
  classifyReexamineReviewTier({
    resolution: "consensus",
    confidence: 0.9,
    answerChanged: false,
    documentKeyFound: true,
  }).tier,
  "confident",
);

assert.equal(
  classifyReexamineReviewTier({
    resolution: "arbitrated",
    confidence: 0.9,
    answerChanged: true,
    documentKeyFound: false,
  }).tier,
  "questionable",
);

const warnings = mergeReexamineTierWarning(
  ["old warning", "reexamine-tier:confident:stale"],
  "questionable",
  "Models disagreed",
);
assert.ok(warnings.some((w) => w.includes("questionable:Models disagreed")));
assert.ok(!warnings.some((w) => w.includes("stale")));

const parsed = parseReexamineReviewTier(warnings);
assert.equal(parsed.tier, "questionable");
assert.equal(parsed.reason, "Models disagreed");

console.log("reexamineReviewTier tests passed");
