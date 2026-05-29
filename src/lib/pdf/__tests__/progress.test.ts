import assert from "node:assert/strict";
import test from "node:test";
import {
  countProgressStatuses,
  countUniqueProblemsFromAttempts,
  findFirstIncompleteIndex,
  resolveProblemProgressFromAttempts,
} from "../../pdf-practice/progress-shared";

test("resolveProblemProgressFromAttempts", () => {
  assert.equal(
    resolveProblemProgressFromAttempts([{ isCorrect: true, skipped: false }]),
    "correct",
  );
  assert.equal(
    resolveProblemProgressFromAttempts([
      { isCorrect: false, skipped: false },
      { isCorrect: true, skipped: false },
    ]),
    "incorrect",
  );
  assert.equal(
    resolveProblemProgressFromAttempts([{ isCorrect: false, skipped: false }]),
    null,
  );
  assert.equal(
    resolveProblemProgressFromAttempts([{ isCorrect: null, skipped: true }]),
    "skipped",
  );
});

test("countUniqueProblemsFromAttempts dedupes retries", () => {
  const stats = countUniqueProblemsFromAttempts([
    { problemId: "p1", isCorrect: false, skipped: false },
    { problemId: "p1", isCorrect: true, skipped: false },
    { problemId: "p2", isCorrect: true, skipped: false },
    { problemId: "p3", isCorrect: false, skipped: false },
    { problemId: "p3", isCorrect: false, skipped: false },
  ]);
  assert.equal(stats.attempted, 3);
  assert.equal(stats.correct, 1);
  assert.equal(stats.incorrect, 2);
});

test("countProgressStatuses", () => {
  const counts = countProgressStatuses({
    a: "correct",
    b: "incorrect",
    c: "skipped",
  });
  assert.equal(counts.done, 3);
  assert.equal(counts.correct, 1);
  assert.equal(counts.incorrect, 1);
  assert.equal(counts.skipped, 1);
});

test("findFirstIncompleteIndex skips finished problems", () => {
  const problems = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const progress = { a: "correct" as const, b: "incorrect" as const, d: "skipped" as const };
  assert.equal(findFirstIncompleteIndex(problems, progress), 2);
  assert.equal(
    findFirstIncompleteIndex(problems, { ...progress, c: "correct" }),
    -1,
  );
});
