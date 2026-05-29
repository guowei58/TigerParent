import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlaceholderAnswerKeyText,
  isParsedMcqChoiceLabel,
  needsAiDerivedAnswerKey,
} from "../answerKeyRules";

test("isPlaceholderAnswerKeyText", () => {
  assert.equal(isPlaceholderAnswerKeyText("[response]"), true);
  assert.equal(isPlaceholderAnswerKeyText("[drawing]"), true);
  assert.equal(isPlaceholderAnswerKeyText(""), true);
  assert.equal(isPlaceholderAnswerKeyText("45"), false);
  assert.equal(isPlaceholderAnswerKeyText("C"), false);
});

test("needsAiDerivedAnswerKey", () => {
  assert.equal(
    needsAiDerivedAnswerKey("short_answer", [], null),
    true,
  );
  assert.equal(
    needsAiDerivedAnswerKey(
      "multiple_choice",
      [{ label: "A" }, { label: "B" }],
      { correctChoiceLabel: "C", correctAnswerText: "C", rawAnswerText: "C" },
    ),
    false,
  );
  assert.equal(
    needsAiDerivedAnswerKey(
      "multiple_choice",
      [{ label: "A" }, { label: "B" }],
      { correctChoiceLabel: null, correctAnswerText: "[response]", rawAnswerText: "[response]" },
    ),
    true,
  );
  assert.equal(
    needsAiDerivedAnswerKey(
      "short_answer",
      [],
      { correctChoiceLabel: "D", correctAnswerText: "D", rawAnswerText: "D" },
    ),
    false,
    "parsed letter key is trusted even when choices were not extracted",
  );
});

test("isParsedMcqChoiceLabel", () => {
  assert.equal(isParsedMcqChoiceLabel("D"), true);
  assert.equal(isParsedMcqChoiceLabel("angle"), false);
});
