/** Shared NY ELA MCQ choice-boundary patterns — keep in sync across parser and display. */
export type ChoiceRow = { label: string; text?: string | null };

export const CHOICE_TEXT_START =
  "(?:[\\u201c\\u201d\"]|paragraph\\s+\\d|[A-Z][a-z]+|[a-z]{2,4}\\s)";

export const CHOICE_A_BOUNDARY_RE = new RegExp(`\\s+A\\s+(?=${CHOICE_TEXT_START})`);

/** NY ELA passage quotes: `A "…" (paragraph 3) B "…" (paragraph 9)` etc. */
export const QUOTED_CHOICE_A_RE = /\s+A\s+(?=[\u201c\u201d"])/;

/** PDF text often places the first quote before the A label: `? "quote…" A (paragraph 2)`. */
const QUOTE_IMMEDIATELY_AFTER_QUESTION = /\?\s*(?=[\u201c\u201d"])/;

/** Index where the answer choices begin (stem ends here). */
export function findChoiceSectionStart(text: string): number {
  let best = -1;
  const consider = (idx: number) => {
    if (idx >= 0 && (best < 0 || idx < best)) best = idx;
  };

  const afterQuestion = QUOTE_IMMEDIATELY_AFTER_QUESTION.exec(text);
  if (afterQuestion) {
    consider(afterQuestion.index + afterQuestion[0].length);
  }

  const quotedA = QUOTED_CHOICE_A_RE.exec(text);
  if (quotedA) consider(quotedA.index);

  const labeledA = CHOICE_A_BOUNDARY_RE.exec(text);
  if (labeledA) consider(labeledA.index);

  return best;
}

export function findFirstChoiceLabelIndex(text: string): number {
  return findChoiceSectionStart(text);
}

export function stripStemFooter(text: string): string {
  return text
    .replace(/\s+Session\s+\d+\s+Page\s+\d+\s*$/i, "")
    .replace(/\s+Page\s+\d+\s+Session\s+\d+\s*$/i, "")
    .replace(/\s+\d{1,2}\s+Page\s+\d+\s*$/i, "")
    .replace(/\s+\d{1,2}\s*$/i, "")
    .trim();
}
