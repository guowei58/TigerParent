import type { PositionedTextItem } from "./positionedTextItems";

export type TextLine = {
  text: string;
  top: number;
};

/** NY-style MCQ stem openers — keep in sync with detectElaReading MCQ_STEM_START. */
const QUESTION_STEM_START =
  /(?:What do the|What does|What is a central|Based on paragraph|Based on the|Which paragraph|Which detail|Which sentence|Which statement|Which meaning of the word|How does|How do|Why does|Why do|According to|Read the sentence|Read the excerpt|Read the passage from|The author|By the end|From paragraph|In paragraph \d|In which section|Explain how|Explain why|Use two details|In the poem|In the article|Preparation is|Which word|What is the meaning|As mentioned in|Animals learn)\b/i;

export function groupPositionedItemsIntoLines(items: PositionedTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: { items: PositionedTextItem[]; top: number }[] = [];

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.top - item.top) <= item.height * 0.55);
    if (line) {
      line.items.push(item);
    } else {
      lines.push({ items: [item], top: item.top });
    }
  }

  return lines
    .map((line) => {
      line.items.sort((a, b) => a.left - b.left);
      const text = line.items
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return { text, top: line.top };
    })
    .filter((line) => line.text.length > 0)
    .sort((a, b) => a.top - b.top);
}

/** Footer band at bottom of NY released-item pages. */
export function isNYFooterLine(text: string, top: number, pageHeight: number): boolean {
  if (pageHeight <= 0) return false;
  if (top < pageHeight * 0.82) return false;

  const t = text.trim();
  if (/\bGO ON\b|\bSTOP\b/i.test(t)) return true;
  if (/\bPage\s+\d+\s+Session\s+\d+/i.test(t)) return true;
  if (/^\d{1,2}(?:\s+\d{1,2}){1,5}$/.test(t)) return true;
  if (/^\d{1,2}\s+Page\s+\d+/i.test(t)) return true;
  return false;
}

/** Prior question's last choice glued onto the top of the next page. */
export function isLeadingChoiceBleedLine(text: string): boolean {
  const t = text.trim();
  if (!/^D\s+/i.test(t)) return false;
  if (QUESTION_STEM_START.test(t)) return false;
  if (t.length > 180) return false;
  return /\?\s/.test(t) === false;
}

export type PageTextBuildOptions = {
  stripFooter?: boolean;
  stripLeadingChoiceBleed?: boolean;
};

export function buildPageTextFromLines(
  lines: TextLine[],
  pageHeight: number,
  options: PageTextBuildOptions = {},
): string {
  const { stripFooter = true, stripLeadingChoiceBleed = false } = options;
  let kept = lines;

  if (stripFooter) {
    kept = kept.filter((line) => !isNYFooterLine(line.text, line.top, pageHeight));
  }

  if (stripLeadingChoiceBleed) {
    while (kept.length > 0 && isLeadingChoiceBleedLine(kept[0]!.text)) {
      kept.shift();
    }
  }

  return kept
    .map((line) => line.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPageTextFromPositionedItems(
  items: PositionedTextItem[],
  pageHeight: number,
  options: PageTextBuildOptions = {},
): string {
  return buildPageTextFromLines(groupPositionedItemsIntoLines(items), pageHeight, options);
}

/** Last pass on ELA question page text before MCQ parsing. */
export function prepareElaQuestionPageText(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();

  // Drop a leading prior-item D choice before the real stem.
  t = t.replace(
    new RegExp(
      `^\\s*D\\s+[^?]{3,200}?\\.\\s+(?=(${QUESTION_STEM_START.source}))`,
      "i",
    ),
    "",
  );

  // Drop trailing next-item bleed after the first complete A–D block.
  const choiceA = /\s+A\s+[\u201c\u201d"'([A-Za-z]/;
  const firstA = t.search(choiceA);
  if (firstA >= 0) {
    const bleedRe = new RegExp(`\\s+(?=${QUESTION_STEM_START.source})\\b`, "i");
    const tail = t.slice(firstA + 15);
    const m = bleedRe.exec(tail);
    if (m && m.index >= 0) {
      t = t.slice(0, firstA + 15 + m.index).trim();
    }
  }

  return t.trim();
}
