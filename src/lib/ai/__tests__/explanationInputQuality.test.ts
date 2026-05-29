import assert from "node:assert/strict";
import test from "node:test";
import {
  assessExplanationInputQuality,
  explanationContradictsAnswerKey,
} from "../explanationInputQuality";

test("flags incomplete PDF extraction", () => {
  const q = assessExplanationInputQuality({
    cleanedText: "Which expression has the same value as ? A B C D 2",
    choices: [],
    correctChoiceLabel: "D",
    correctAnswerText: "D",
    gradeLevel: 4,
    subject: "math",
  });
  assert.equal(q.usable, false);
  assert.ok(q.reasons.length > 0);
});

test("detects explanation contradicting answer key", () => {
  assert.equal(
    explanationContradictsAnswerKey(
      "1. Only option C equals 2.\n\n2. Therefore, the correct choice is C.",
      "D",
    ),
    true,
  );
  assert.equal(
    explanationContradictsAnswerKey("1. Choice D matches because 28/6 = 28 × 1/6.", "D"),
    false,
  );
});
