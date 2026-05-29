import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeExplanationText,
  parseExplanationSteps,
} from "../formatExplanation";

test("parseExplanationSteps — Step N: format", () => {
  const steps = parseExplanationSteps(
    "Step 1: First thing. Step 2: Second thing. Step 3: Done.",
  );
  assert.equal(steps.length, 3);
  assert.match(steps[0]!.body, /First/);
  assert.match(steps[2]!.body, /Done/);
});

test("parseExplanationSteps — inline 1. 2. 3.", () => {
  const steps = parseExplanationSteps(
    "1. Recall hexagon has 6 sides. 2. Look at each shape. 3. Shape D is the hexagon.",
  );
  assert.equal(steps.length, 3);
});

test("normalizeExplanationText", () => {
  const out = normalizeExplanationText("Step 1: A. Step 2: B.");
  assert.match(out, /^1\. A/);
  assert.match(out, /\n\n2\. B/);
});
