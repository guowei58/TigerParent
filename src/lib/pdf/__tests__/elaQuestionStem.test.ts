import assert from "node:assert/strict";
import test from "node:test";
import { elaQuestionStem } from "../elaDisplay";
import { parseSingleQuestionFromPage } from "../detectElaReading";

const inlineMcq =
  "Based on paragraph 14, why does Sammy make a confused face in paragraph 15? A He is surprised that Sylvie thinks it is getting late. B He is disappointed that Sylvie was ready before him. C He is worried his parents did not pack everything. D He is not sure why they need a booth for the dog. Session 1 Page 5";

test("parseSingleQuestionFromPage separates stem from simple inline choices", () => {
  const q = parseSingleQuestionFromPage(inlineMcq);
  assert.ok(q);
  assert.equal(
    q!.stem,
    "Based on paragraph 14, why does Sammy make a confused face in paragraph 15?",
  );
  assert.equal(q!.choices.length, 4);
});

test("elaQuestionStem strips inline choices when structured choices exist", () => {
  const q = parseSingleQuestionFromPage(inlineMcq)!;
  const stem = elaQuestionStem(inlineMcq, q.choices);
  assert.equal(
    stem,
    "Based on paragraph 14, why does Sammy make a confused face in paragraph 15?",
  );
});

test("elaQuestionStem strips inline MCQ block even without structured choices", () => {
  const stem = elaQuestionStem(inlineMcq, []);
  assert.equal(
    stem,
    "Based on paragraph 14, why does Sammy make a confused face in paragraph 15?",
  );
});
