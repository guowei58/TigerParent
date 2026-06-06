import test from "node:test";
import assert from "node:assert/strict";
import {
  assessElaTextExtraction,
  shouldUseElaScannedFallback,
} from "../elaTextExtractionQuality";

test("assessElaTextExtraction flags scanned PDFs with almost no text", () => {
  const pages = Array.from({ length: 54 }, (_, i) => ({
    pageNumber: i + 1,
    text: i === 0 ? "x".repeat(50) : "",
  }));
  pages.push({ pageNumber: 55, text: "Grade 3 Answer Key\n1. B Answer: D" });

  const q = assessElaTextExtraction(pages, 1);
  assert.equal(q.needsVisionFallback, true);
  assert.ok(q.nonEmptyRatio < 0.2);
});

test("assessElaTextExtraction does not flag normal ELA PDFs", () => {
  const pages = Array.from({ length: 20 }, (_, i) => ({
    pageNumber: i + 1,
    text: `Read this passage. Question ${i + 1}\nA choice\nB choice\nC choice\nD choice\n`.repeat(
      5,
    ),
  }));
  pages.push({ pageNumber: 21, text: "Answer Key\n1. A\n2. B" });

  const q = assessElaTextExtraction(pages, 1);
  assert.equal(q.needsVisionFallback, false);
});

test("shouldUseElaScannedFallback only when sparse text and few detections", () => {
  const sparse = assessElaTextExtraction(
    [
      ...Array.from({ length: 54 }, (_, i) => ({
        pageNumber: i + 1,
        text: "",
      })),
      { pageNumber: 55, text: "Answer Key 1. A" },
    ],
    1,
  );
  assert.equal(shouldUseElaScannedFallback(sparse, 0, 30), true);
  assert.equal(shouldUseElaScannedFallback(sparse, 25, 30), false);

  const rich = assessElaTextExtraction(
    [
      { pageNumber: 1, text: "x".repeat(200) },
      { pageNumber: 2, text: "y".repeat(200) },
    ],
    1,
  );
  assert.equal(shouldUseElaScannedFallback(rich, 0, 30), false);
});
