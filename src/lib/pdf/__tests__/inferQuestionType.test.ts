import assert from "node:assert/strict";
import test from "node:test";
import { inferQuestionType } from "../inferQuestionType";

test("answer key letter A-D implies multiple choice", () => {
  assert.equal(
    inferQuestionType({
      rawText: "Which expression has the same value as ? A B C D 2",
      correctChoiceLabel: "D",
    }),
    "multiple_choice",
  );
});

test("sparse A B C D markers imply multiple choice", () => {
  assert.equal(
    inferQuestionType({
      rawText: "Which expression has the same value as ? A B C D",
    }),
    "multiple_choice",
  );
});

test("n/a answer key is open response", () => {
  assert.equal(
    inferQuestionType({
      rawText: "",
      correctChoiceLabel: null,
      correctAnswerText: "n/a",
    }),
    "open_response",
  );
});

test("letter key without mcq text still implies multiple choice", () => {
  assert.equal(
    inferQuestionType({
      rawText: "List all the factors of 21.",
      correctChoiceLabel: "C",
      choiceCount: 0,
      cleanedTextLength: 30,
    }),
    "multiple_choice",
  );
});

test("letter key with empty text still mcq when pdf has no extractable text", () => {
  assert.equal(
    inferQuestionType({
      rawText: "",
      correctChoiceLabel: "C",
      choiceCount: 0,
    }),
    "multiple_choice",
  );
});
