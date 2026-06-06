import assert from "node:assert/strict";
import {
  detectProblemsFromPages,
  detectProblemsOnePerPage,
  splitAnswerKeySection,
} from "../detectProblems";
import { parseAnswerKey } from "../parseAnswerKey";
import { parseAnswerChoices } from "../parseAnswerChoices";

function testProblemNumberNotDecimal() {
  const text = "The value is 15.74 units.\n16. What is 2+2?\nA. 3\nB. 4\n";
  const pages = [{ pageNumber: 1, text }];
  const regions = detectProblemsFromPages(pages);
  assert.equal(regions.some((r) => r.problemNumber === 16), true);
  assert.equal(regions.some((r) => r.problemNumber === 15), false);
}

function testAnswerKeyParse() {
  const key = parseAnswerKey("Answer Key\n1. C\n2. B\n27. 4 bags");
  assert.equal(key.length, 3);
  assert.equal(key[0]!.correctChoiceLabel, "C");
  assert.equal(key[2]!.problemNumber, 27);
}

function testVisualDetection() {
  const text = "3. The diagram below shows a rectangle.\nA. 1\nB. 2\n";
  const pages = [{ pageNumber: 1, text }];
  const regions = detectProblemsFromPages(pages);
  const p3 = regions.find((r) => r.problemNumber === 3);
  assert.ok(p3?.requiresImage);
}

function testChoices() {
  const ch = parseAnswerChoices("1. Test?\nA. one\nB. two\nC. three\nD. four\n");
  assert.equal(ch.length, 4);
  assert.equal(ch[0]!.label, "A");
}

function testOneProblemPerPage() {
  const pages = Array.from({ length: 12 }, (_, i) => ({
    pageNumber: i + 1,
    text: `Problem body for page ${i + 1}`,
  }));
  const { regions, answerKeySection, problemPageCount } = detectProblemsOnePerPage(pages, 3);
  assert.equal(problemPageCount, 9);
  assert.equal(regions.length, 9);
  assert.equal(regions[0]!.problemNumber, 1);
  assert.equal(regions[8]!.problemNumber, 9);
  assert.ok(answerKeySection.includes("page 10"));
}

function testProblemAtticAnswerKey() {
  const key = parseAnswerKey(
    "1. Answer: C Objective: NYS 3.M.02\n2. Answer: B\n197. Answer: $90 Objective: CC 3.OA.8",
  );
  assert.equal(key.length, 3);
  assert.equal(key[0]!.correctChoiceLabel, "C");
  assert.equal(key[2]!.problemNumber, 197);
  assert.equal(key[2]!.correctAnswerText, "$90");
}

function testInlineAnswerKeyAfterHeader() {
  const key = parseAnswerKey(
    "test 5/27/2026 1. Answer: C Objective: CC 6.G.4 Points: 1 2. Answer: A Objective: CC 6.EE.2a Points: 1",
  );
  assert.equal(key.length, 2);
  assert.equal(key[0]!.problemNumber, 1);
  assert.equal(key[0]!.correctChoiceLabel, "C");
  assert.equal(key[1]!.correctChoiceLabel, "A");
}

function testStackedAnswerKey() {
  const key = parseAnswerKey("1.\nAnswer: C\nObjective: CC 6.G.4\nPoints: 1\n");
  assert.equal(key[0]!.problemNumber, 1);
  assert.equal(key[0]!.correctChoiceLabel, "C");
}

function testInlineNaAnswerKey() {
  const key = parseAnswerKey(
    "19. Answer: B Objective: 4.OA.2 Points: 1 20. Answer: n/a Objective: 4.MD.5a Points: 1",
  );
  assert.equal(key.length, 2);
  assert.equal(key[1]!.problemNumber, 20);
  assert.equal(key[1]!.correctAnswerText, "n/a");
  assert.equal(key[1]!.correctChoiceLabel, null);
}

function testNyElaGridAnswerKey2019() {
  const key = parseAnswerKey(
    "Grade 3 ELA Answer Key 1. 8. 27. Answer: B Answer: D Answer: n/a Objective: x 2. 9. 28. Answer: C Answer: C Answer: n/a Objective: y 6. 25. Answer: C Answer: n/a Objective: z",
  );
  assert.equal(key.find((k) => k.problemNumber === 1)?.correctChoiceLabel, "B");
  assert.equal(key.find((k) => k.problemNumber === 8)?.correctChoiceLabel, "D");
  assert.equal(key.find((k) => k.problemNumber === 27)?.correctAnswerText, "n/a");
  assert.equal(key.find((k) => k.problemNumber === 2)?.correctChoiceLabel, "C");
  assert.equal(key.find((k) => k.problemNumber === 6)?.correctChoiceLabel, "C");
  assert.equal(key.find((k) => k.problemNumber === 25)?.correctAnswerText, "n/a");
}

function testNyElaGridAnswerKey2021() {
  const key = parseAnswerKey(
    "Grade 3 ELA Answer Key 1. 10. Answer: B Answer: D Objective: a 2. 11. Answer: C Answer: A Objective: b",
  );
  assert.equal(key.length, 4);
  assert.equal(key.find((k) => k.problemNumber === 1)?.correctChoiceLabel, "B");
  assert.equal(key.find((k) => k.problemNumber === 10)?.correctChoiceLabel, "D");
  assert.equal(key.find((k) => k.problemNumber === 11)?.correctChoiceLabel, "A");
}

function testStructuredKeySkipsLooseEntryRegex() {
  const key = parseAnswerKey(
    "1. What is 2+2?\n2. More text\n1. Answer: D Objective: 4.NF.4a\n2. Answer: D Objective: 4.NBT.5",
  );
  assert.equal(key[0]!.correctChoiceLabel, "D");
  assert.equal(key[1]!.correctChoiceLabel, "D");
}

testProblemNumberNotDecimal();
testAnswerKeyParse();
testVisualDetection();
testChoices();
testOneProblemPerPage();
testProblemAtticAnswerKey();
testInlineAnswerKeyAfterHeader();
testStackedAnswerKey();
testInlineNaAnswerKey();
testNyElaGridAnswerKey2019();
testNyElaGridAnswerKey2021();
testStructuredKeySkipsLooseEntryRegex();
console.log("pdf parsing tests: ok");
