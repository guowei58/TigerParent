import assert from "node:assert/strict";
import test from "node:test";
import type { PositionedTextItem } from "../positionedTextItems";
import {
  buildPageTextFromPositionedItems,
  groupPositionedItemsIntoLines,
  isLeadingChoiceBleedLine,
  isNYFooterLine,
  prepareElaQuestionPageText,
} from "../pageTextReadingOrder";

function item(str: string, top: number, left = 40): PositionedTextItem {
  return { str, left, top, width: str.length * 8, height: 14 };
}

test("buildPageTextFromPositionedItems reads top-to-bottom not PDF stream order", () => {
  const pageHeight = 800;
  const items = [
    item("D It introduces a new character.", 40, 40),
    item("Which meaning of the word", 120, 40),
    item('"spread" is used in paragraph 5?', 136, 40),
    item("A scattered around", 180, 40),
    item("B grew slowly", 196, 40),
    item("C became known", 212, 40),
    item("D shared freely", 228, 40),
    item("8 Page 9 GO ON Session 1", 760, 40),
  ];

  const text = buildPageTextFromPositionedItems(items, pageHeight, {
    stripFooter: true,
    stripLeadingChoiceBleed: true,
  });

  assert.match(text, /^Which meaning of the word/);
  assert.doesNotMatch(text, /introduces a new character/);
  assert.doesNotMatch(text, /GO ON/);
});

test("isLeadingChoiceBleedLine detects prior-item D lines only", () => {
  assert.equal(isLeadingChoiceBleedLine("D It introduces a new character."), true);
  assert.equal(
    isLeadingChoiceBleedLine("Which meaning of the word spread is used in paragraph 5?"),
    false,
  );
});

test("isNYFooterLine ignores paragraph references in the question body", () => {
  assert.equal(isNYFooterLine("paragraph 15", 200, 800), false);
  assert.equal(isNYFooterLine("19 20 21 GO ON", 760, 800), true);
});

test("prepareElaQuestionPageText strips leading and trailing bleed on flat strings", () => {
  const page =
    'D It introduces a new character. Which meaning of the word "spread" is used in paragraph 5? A scattered around B grew slowly C became known D shared freely Which word best describes the author? A x B y C z D w';

  const t = prepareElaQuestionPageText(page);
  assert.match(t, /^Which meaning of the word "spread"/);
  assert.doesNotMatch(t, /introduces a new character/);
  assert.doesNotMatch(t, /Which word best describes/);
});

test("groupPositionedItemsIntoLines merges items on the same row", () => {
  const lines = groupPositionedItemsIntoLines([
    item("A", 100, 40),
    item("scattered around", 100, 60),
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]!.text, "A scattered around");
});
