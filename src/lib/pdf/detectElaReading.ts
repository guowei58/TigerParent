import type { DetectedProblemRegion } from "./detectProblems";
import { inferQuestionType } from "./inferQuestionType";
import type { ParsedChoice } from "./parseAnswerChoices";
import { formatPassageBodyText } from "./formatPassageText";
import { prepareElaQuestionPageText } from "./pageTextReadingOrder";
import { CHOICE_A_BOUNDARY_RE, CHOICE_TEXT_START, findChoiceSectionStart, QUOTED_CHOICE_A_RE } from "./elaMcqPatterns";

export type DetectedElaPassage = {
  passageNumber: number;
  title: string | null;
  promptText: string | null;
  bodyText: string;
  pageStart: number;
  pageEnd: number;
  pageNumbers: number[];
  questionRangeStart: number | null;
  questionRangeEnd: number | null;
};

export type ElaDetectionResult = {
  passages: DetectedElaPassage[];
  regions: DetectedProblemRegion[];
  answerKeySection: string;
  problemPageCount: number;
  answerKeyPageCount: number;
};

const PASSAGE_INTRO_RE =
  /Read this (?:story|passage|poem|article|text)|Directions[\s\S]{0,80}Read this/i;
const QUESTION_RANGE_RE =
  /answer questions?\s+(\d+)\s+(?:through|and)\s+(\d+)/i;
/** NY 2-point constructed response pages (item id + stem, no A–D in extracted text). */
const NY_CONSTRUCTED_ITEM_RE = /\b1[34]\d{6}\s+/;
const CONSTRUCTED_RESPONSE_STEM_RE =
  /\bUse (?:two )?details from (?:the )?(?:story|article|passage)\b/i;
const EXCERPT_TITLE_RE = /Excerpt from\s+(.+?)(?:\s+by\s+|\.\s|$)/i;
/** NY short-response intro — PDF text often corrupts "This" to a private-use glyph + "is". */
const SHORT_ANSWER_RE = /\S*\s*is question is worth\s+\d+\s+credits?\./i;
const SHORT_ANSWER_BLOCK_RE = /\S*\s*is question is worth\s+\d+\s+credits?\./gi;
const ANSWER_KEY_PAGE_RE = /^(?:Grade\s+\d+\s+)?(?:ELA\s+)?Answer Key\b/i;

const QUESTION_STEM_RE =
  /(?:In paragraph|In which section|Based on paragraph|Based on the|What do the|What does|Which paragraph|Which detail|Which sentence|Which statement|Which meaning of the word|How does|How do|Why does|Why do|According to|Read the sentence|Read the excerpt|Read the passage from|The author|By the end|Explain how|Explain why|Use two details|In the poem|In the article|From paragraph|Preparation is|Which word|What is the meaning|As mentioned in|Animals learn)/i;

function stemKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
}

function cleanPageText(text: string): string {
  return text
    .replace(/\n--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\bPage\s+\d+\s+Session\s+\d+/gi, "")
    .replace(/\bGO ON\b|\bSTOP\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Shared stem prefixes for NY-style ELA MCQs (numbered and unnumbered). */
const MCQ_STEM_START =
  "(?:What do the|What does|What is a central|Based on paragraph|Based on the|Which paragraph|Which detail|Which sentence|Which statement|Which meaning of the word|How does|How do|Why does|Why do|According to|Read the sentence|Read the excerpt|Read the passage from|The author|By the end|From paragraph|In paragraph \\d|In which section|Explain how|Explain why|Use two details|In the poem|In the article|Preparation is|Which word|What is the meaning|As mentioned in|Animals learn)";

/** Case-sensitive A label before choice text — not "A balloon" inside a quote. */
const CHOICE_A_RE = CHOICE_A_BOUNDARY_RE;

function choiceLabelRe(letter: string): RegExp {
  return new RegExp(`\\s${letter}\\s+(?=${CHOICE_TEXT_START})`, "g");
}

function pageHasMcqChoices(text: string): boolean {
  return (
    choiceLabelRe("A").test(text) &&
    choiceLabelRe("B").test(text) &&
    choiceLabelRe("C").test(text) &&
    choiceLabelRe("D").test(text)
  );
}

function pageHasAnyChoiceLabels(text: string): boolean {
  return (
    choiceLabelRe("A").test(text) ||
    choiceLabelRe("B").test(text) ||
    choiceLabelRe("C").test(text) ||
    choiceLabelRe("D").test(text)
  );
}

/** Some NY ELA PDFs extract as a bare grid: `1 A B C D 2 A B C D ...` (no choice text). */
function pageHasChoiceLetterGrid(text: string): boolean {
  if (!/\bA\s+B\s+C\s+D\b/.test(text)) return false;
  // Require at least one nearby item number to avoid matching random letter sequences.
  return /\b\d{1,3}\b/.test(text);
}

function isAnswerKeyPage(text: string): boolean {
  return ANSWER_KEY_PAGE_RE.test(text.trim()) || /\bAnswer:\s*[A-Dn]/i.test(text.slice(0, 400));
}

/** Short constructed-response items (common on NY ELA end-of-booklet passages). */
function isConstructedResponseQuestionPage(text: string): boolean {
  if (SHORT_ANSWER_RE.test(text)) return true;
  if (CONSTRUCTED_RESPONSE_STEM_RE.test(text) && QUESTION_STEM_RE.test(text)) return true;
  if (NY_CONSTRUCTED_ITEM_RE.test(text) && QUESTION_STEM_RE.test(text)) return true;
  return false;
}

function trimConstructedResponseStem(text: string): string {
  const t = cleanPageText(text);
  const cut = t.search(/\bPrimary CCLS\b/i);
  return (cut > 0 ? t.slice(0, cut) : t).trim().slice(0, 2000);
}

/** NY item codes often end with the booklet question number (e.g. 14303038 → 38). */
function extractNyItemQuestionNumber(text: string): number | null {
  const m = text.match(/\b1[34]\d{2}(\d{2})\d{2}\s+/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return n >= 1 && n <= 60 ? n : null;
}

function isQuestionPage(text: string): boolean {
  if (PASSAGE_INTRO_RE.test(text) && !pageHasMcqChoices(text) && !SHORT_ANSWER_RE.test(text)) {
    return false;
  }
  if (SHORT_ANSWER_RE.test(text)) return true;
  if (isConstructedResponseQuestionPage(text)) return true;
  if (pageHasMcqChoices(text)) return true;
  if (pageHasChoiceLetterGrid(text) && !PASSAGE_INTRO_RE.test(text)) return true;
  /**
   * Avoid misclassifying passage pages as questions just because the passage contains
   * question-like phrases ("Why do...", "Which..."). Treat it as a question page only
   * when we also see choice labels in the extracted text.
   */
  if (QUESTION_STEM_RE.test(text) && pageHasAnyChoiceLabels(text)) return true;
  if (/\bKey:\s*[A-D]\b/.test(text) && pageHasMcqChoices(text)) return true;
  return false;
}

/** Clip bleed from the next question on the same extracted page blob. */
function trimPageToFirstQuestion(text: string): string {
  const t = cleanPageText(text);
  const firstA = t.search(CHOICE_A_RE);
  if (firstA < 0) return t;

  const bleedRe = new RegExp(`\\s+(?=${MCQ_STEM_START})\\b`);
  const m = bleedRe.exec(t.slice(firstA + 15));
  if (m && m.index >= 0) {
    return t.slice(0, firstA + 15 + m.index).trim();
  }
  return t;
}

function parseMcqBlock(block: string): { stem: string; choices: ParsedChoice[] } | null {
  const choices = parseElaMcqChoices(block);
  if (choices.length < 4) return null;

  const stemEnd = findChoiceSectionStart(block);
  if (stemEnd < 0) return null;

  const stem = normalizeMcqStem(
    block
      .slice(0, stemEnd)
      .replace(/^[\s"''\u201c\u201d]+/, "")
      .trim(),
  );

  return {
    stem,
    choices: choices.map((c) => ({
      ...c,
      text: c.text ? stripPageFooter(c.text) : null,
    })),
  };
}

const MIN_PASSAGE_TEXT_CHARS = 80;

function isPassagePage(text: string): boolean {
  if (isAnswerKeyPage(text)) return false;
  if (isQuestionPage(text)) return false;
  if (isConstructedResponseQuestionPage(text)) return false;
  if (/^Directions\s+\d+/i.test(text.trim())) return false;
  // Passage intro pages can be short but still mark the start of a passage.
  if (PASSAGE_INTRO_RE.test(text)) return true;
  return text.trim().length > MIN_PASSAGE_TEXT_CHARS;
}

/** Title/diagram pages often have no extractable text but belong to the following passage. */
function isImageOnlyPassagePage(
  text: string,
  nextPage: { text: string } | undefined,
  alreadyInPassage: boolean,
): boolean {
  if (text.trim().length >= MIN_PASSAGE_TEXT_CHARS) return false;
  if (isAnswerKeyPage(text)) return false;
  if (isQuestionPage(text)) return false;
  if (nextPage && isPassagePage(nextPage.text)) return true;
  if (alreadyInPassage && nextPage && isPassagePage(nextPage.text)) return true;
  /** Body page before constructed-response / short-answer questions (often < 80 chars extracted). */
  if (alreadyInPassage && nextPage && isQuestionPage(nextPage.text)) return true;
  return false;
}

/** Match only at NY-style question numbers — avoids mid-sentence "in paragraph(s)". */
export const MCQ_QUESTION_START_RE = new RegExp(
  `\\b(\\d+)\\s+(?=${MCQ_STEM_START})\\b`,
  "g",
);

function stripPageFooter(text: string): string {
  let t = text;
  // Footer clusters are single-digit page indicators (e.g. "4 5 6 GO ON"), not "paragraph 19".
  t = t.replace(/\s+(?:[1-9](?:\s+[1-9]){1,5})\s*GO ON\s*$/i, "");
  t = t.replace(/\s+(?:[1-9](?:\s+[1-9]){1,5})\s*$/i, "");
  t = t.replace(/\)\s+\d{1,2}\s*$/i, ")");
  t = t.replace(/\s+\d+\s+Page\s+\d+\s+Session\s+\d+\s*(?:GO ON\s*)?$/i, "");
  t = t.replace(/\.\s+\d{1,2}\s*$/i, ".");
  t = t.replace(/\s+\d{1,2}\s+STOP\s*$/i, "");
  t = t.replace(/\s+STOP\s*$/i, "");
  // cleanPageText strips "Page N Session M" before we get here — lone item numbers remain.
  if (!/\bparagraph\s+\d{1,2}\s*$/i.test(t)) {
    t = t.replace(/\s+\d{1,2}\s*$/i, "");
  }
  return t.trim();
}

/** Short-response pages can bleed like MCQs — keep only the first "worth N credits" block. */
function trimPageToFirstShortAnswer(text: string): string {
  const normalized = text.replace(/\s+/g, " ");
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SHORT_ANSWER_BLOCK_RE.source, "gi");
  while ((m = re.exec(normalized)) !== null) {
    indices.push(m.index);
  }
  if (indices.length <= 1) {
    return cleanPageText(text);
  }
  return cleanPageText(normalized.slice(indices[0]!, indices[1]!).trim());
}

/** NY ELA footers embed the official item number (e.g. "21 Page 22 Session 1", "19 20 21 GO ON"). */
export function extractQuestionNumberFromPageFooter(text: string): number | null {
  // Do not use cleanPageText — it strips GO ON / STOP footers we need to read.
  const t = text.replace(/\s+/g, " ").trim();

  const beforePage = t.match(/(\d{1,2}(?:\s+\d{1,2})*)\s+Page\s+\d+\b/i);
  if (beforePage) {
    const first = beforePage[1]!.trim().split(/\s+/)[0];
    if (first) return parseInt(first, 10);
  }

  const goOnCluster = t.match(/\s((?:\d{1,2}\s+){1,6})GO ON\s*$/i);
  if (goOnCluster) {
    const first = goOnCluster[1]!.trim().split(/\s+/)[0];
    if (first) return parseInt(first, 10);
  }

  const stopCluster = t.match(/\s((?:\d{1,2}\s+){1,4})STOP\s*$/i);
  if (stopCluster) {
    const first = stopCluster[1]!.trim().split(/\s+/)[0];
    if (first) return parseInt(first, 10);
  }

  return null;
}

function stripSpuriousInlineChoiceLabels(text: string): string {
  return text
    .replace(/(?<=\w)\s([BCD])\s+(?=\w)/g, " ")
    .replace(/"\s*[^\w"']{0,3}\s*en we can sell/i, '"Then we can sell')
    .replace(
      /[\u201c\u201d"](?:☐|[\uFFFD]|[\uE000-\uF8FF]|\[\])\s*ey use/i,
      '"They use',
    )
    .replace(/\s([A-D])\s+(?=\(\s*paragraph\s+\d+\s*\)\s*$)/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clipChoiceText(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  t = stripSpuriousInlineChoiceLabels(t);
  // Next question bleed on same PDF page (e.g. "paragraph 15 Which detail best…").
  const nextQuestion = new RegExp(`\\s+(?=${MCQ_STEM_START})\\b`);
  const m = nextQuestion.exec(t);
  if (m && m.index > 0) {
    t = t.slice(0, m.index).trim();
  }
  t = stripPageFooter(t);
  return t.slice(0, 500) || t;
}

type ChoiceBoundary = { labelStart: number; contentStart: number };

function findChoiceBoundary(
  block: string,
  letter: string,
  searchFrom: number,
): ChoiceBoundary | null {
  const re = choiceLabelRe(letter);
  re.lastIndex = searchFrom;
  const m = re.exec(block);
  if (m) {
    return { labelStart: m.index, contentStart: m.index + m[0].length };
  }

  // PDF text sometimes drops the letter label: `(paragraph 3) "Then…"` with no `B`.
  if (letter !== "A") {
    const paraThenQuote =
      /["'\u201d]\s*\(\s*paragraph\s+\d+\s*\)\s*(?=[\u201c\u201d"])/gi;
    paraThenQuote.lastIndex = searchFrom;
    const pm = paraThenQuote.exec(block);
    if (pm) {
      const contentStart = pm.index + pm[0].length;
      return { labelStart: contentStart, contentStart };
    }
  }

  return null;
}

function parseQuotedParagraphRefChoices(block: string): ParsedChoice[] | null {
  const sectionStart = findChoiceSectionStart(block);
  if (sectionStart < 0) return null;

  const section = block.slice(sectionStart);
  const paraMatches = [...section.matchAll(/\(\s*paragraph\s+\d+\s*\)/gi)];
  if (paraMatches.length < 4) return null;

  const labels = ["A", "B", "C", "D"] as const;
  return labels.map((label, i) => {
    const para = paraMatches[i]!;
    const sliceEnd = para.index! + para[0].length;
    const sliceStart =
      i === 0 ? 0 : paraMatches[i - 1]!.index! + paraMatches[i - 1]![0].length;
    let text = section.slice(sliceStart, sliceEnd).trim();
    text = text.replace(new RegExp(`^\\s*${label}\\s+`), "");
    return {
      label,
      text: clipChoiceText(text) || null,
      sortOrder: i,
    };
  });
}

function parseElaMcqChoicesLegacy(block: string): ParsedChoice[] {
  const m = block.match(
    /\s+A\s+([\s\S]+?)\s+B\s+([\s\S]+?)\s+C\s+([\s\S]+?)\s+D\s+([\s\S]+?)$/,
  );
  if (!m) return [];
  return (["A", "B", "C", "D"] as const).map((label, i) => ({
    label,
    text: clipChoiceText(m[i + 1]!) || null,
    sortOrder: i,
  }));
}

export function parseElaMcqChoices(block: string): ParsedChoice[] {
  const paragraphChoices = parseQuotedParagraphRefChoices(block);
  if (paragraphChoices?.length === 4 && paragraphChoices.every((c) => c.text)) {
    return paragraphChoices;
  }

  const letters = ["A", "B", "C", "D"] as const;
  const boundaries: ChoiceBoundary[] = [];
  let searchFrom = 0;

  for (const letter of letters) {
    const boundary = findChoiceBoundary(block, letter, searchFrom);
    if (!boundary) return parseElaMcqChoicesLegacy(block);
    boundaries.push(boundary);
    searchFrom = boundary.contentStart;
  }

  return letters.map((label, i) => {
    const start = boundaries[i]!.contentStart;
    const end = boundaries[i + 1]?.labelStart ?? block.length;
    return {
      label,
      text: clipChoiceText(block.slice(start, end)) || null,
      sortOrder: i,
    };
  });
}

export function findMcqQuestionStartIndices(text: string): number[] {
  const indices = new Set<number>();
  let m: RegExpExecArray | null;

  const numbered = new RegExp(MCQ_QUESTION_START_RE.source, "g");
  while ((m = numbered.exec(text)) !== null) {
    indices.add(m.index);
  }

  const trimmed = text.trimStart();
  const leadingWs = text.length - trimmed.length;
  const atStart = new RegExp(`^${MCQ_STEM_START}\\b`);
  const startMatch = atStart.exec(trimmed);
  if (startMatch) {
    indices.add(leadingWs + startMatch.index);
  }

  const afterBoundary = new RegExp(`[.?]\\s+(?=${MCQ_STEM_START})\\b`, "g");
  while ((m = afterBoundary.exec(text)) !== null) {
    indices.add(m.index + m[0].length);
  }

  if (indices.size === 0 && pageHasMcqChoices(text)) {
    indices.add(0);
  }

  return [...indices].sort((a, b) => a - b);
}

/** NY ELA: one question per page, but extracted text may start with the prior item's last choice. */
function looksLikeLeadingChoiceBleed(prefix: string): boolean {
  const t = prefix.trim();
  if (!t) return false;
  if (/^D\s+/i.test(t)) return true;
  return t.length < 120 && /\bD\s+[^.]+\.\s*$/.test(t);
}

function resolvePageQuestionStart(text: string, starts: number[]): number {
  const trimmed = text.trimStart();
  if (!looksLikeLeadingChoiceBleed(trimmed)) return 0;

  for (const start of starts) {
    if (start > 0 && looksLikeLeadingChoiceBleed(text.slice(0, start))) {
      return start;
    }
  }
  return starts[0] ?? 0;
}

function normalizeMcqStem(stem: string): string {
  return stem.replace(/^\d+\s+/, "").replace(/\s+/g, " ").trim();
}

export function splitMcqBlocks(text: string): {
  stem: string;
  choices: ParsedChoice[];
  questionNumber: number | null;
}[] {
  const blocks: { stem: string; choices: ParsedChoice[]; questionNumber: number | null }[] = [];
  const indices = findMcqQuestionStartIndices(text);
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i]!;
    const end = indices[i + 1] ?? text.length;
    const chunk = text.slice(start, end).trim();
    const qNumMatch = chunk.match(/^\s*(\d{1,3})\b/);
    const questionNumber = qNumMatch ? parseInt(qNumMatch[1]!, 10) : null;
    const choices = parseElaMcqChoices(chunk);
    if (choices.length >= 4) {
      const stemEnd = findChoiceSectionStart(chunk);
      const stem = normalizeMcqStem(
        stemEnd >= 0 ? chunk.slice(0, stemEnd) : chunk,
      );
      blocks.push({ stem, choices, questionNumber });
    }
  }
  return blocks;
}

/**
 * NY ELA PDFs: one question per page (passages may span pages; extracted text may bleed).
 * Parse the whole page — stem from start through first A/B/C/D block.
 */
export function parseSingleQuestionFromPage(
  text: string,
): { stem: string; choices: ParsedChoice[] } | null {
  const cleaned = cleanPageText(text);
  const starts = findMcqQuestionStartIndices(cleaned);
  const pageStart = resolvePageQuestionStart(cleaned, starts);
  const sliced = pageStart > 0 ? cleaned.slice(pageStart) : cleaned;
  const trimmed = trimPageToFirstQuestion(sliced);
  const block = parseMcqBlock(trimmed);
  if (block) return block;

  const blocks = splitMcqBlocks(trimmed);
  const first = blocks[0];
  if (!first) return null;
  return { stem: first.stem, choices: first.choices };
}

function extractPassageMeta(firstPageText: string): {
  title: string | null;
  promptText: string | null;
  questionRangeStart: number | null;
  questionRangeEnd: number | null;
} {
  const excerpt = firstPageText.match(EXCERPT_TITLE_RE);
  const book = firstPageText.match(/([A-Z][^.\n]{2,40})\s+by\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
  const range = firstPageText.match(QUESTION_RANGE_RE);
  const promptLine = firstPageText.match(
    /Read this (?:story|passage|poem|article)[^.]*\.[^.]*answer questions?[^.]+\./i,
  );
  return {
    title: excerpt?.[1]?.trim() ?? book?.[1]?.trim() ?? null,
    promptText: promptLine?.[0]?.replace(/\s+/g, " ").trim() ?? null,
    questionRangeStart: range ? parseInt(range[1]!, 10) : null,
    questionRangeEnd: range ? parseInt(range[2]!, 10) : null,
  };
}

/**
 * ELA layout: trailing page(s) are answer key; passage pages may span multiple pages;
 * each question page contains exactly one MCQ (extracted text may include bleed from neighbors).
 */
export function detectElaReadingProblems(
  pages: { pageNumber: number; text: string }[],
  answerKeyPageCount: number,
): ElaDetectionResult {
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const maxPage = sorted[sorted.length - 1]?.pageNumber ?? 0;
  const trailing = Math.max(1, Math.min(answerKeyPageCount, maxPage));
  const firstAnswerPage = maxPage - trailing + 1;

  const answerPages = sorted.filter((p) => p.pageNumber >= firstAnswerPage);
  const contentPages = sorted.filter(
    (p) => p.pageNumber < firstAnswerPage && !isAnswerKeyPage(p.text),
  );

  const passages: DetectedElaPassage[] = [];
  const regions: DetectedProblemRegion[] = [];
  const assignedProblemNumbers = new Set<number>();
  const assignedStems = new Set<string>();

  let passageNumber = 0;
  let currentPassagePages: { pageNumber: number; text: string }[] = [];
  let currentMeta: ReturnType<typeof extractPassageMeta> | null = null;
  let nextProblemNumber = 1;

  function flushPassage() {
    if (currentPassagePages.length === 0) return;
    passageNumber++;
    const bodyText = formatPassageBodyText(currentPassagePages);
    passages.push({
      passageNumber,
      title: currentMeta?.title ?? null,
      promptText: currentMeta?.promptText ?? null,
      bodyText,
      pageStart: currentPassagePages[0]!.pageNumber,
      pageEnd: currentPassagePages[currentPassagePages.length - 1]!.pageNumber,
      pageNumbers: currentPassagePages.map((p) => p.pageNumber),
      questionRangeStart: currentMeta?.questionRangeStart ?? null,
      questionRangeEnd: currentMeta?.questionRangeEnd ?? null,
    });
    currentPassagePages = [];
    currentMeta = null;
  }

  for (let i = 0; i < contentPages.length; i++) {
    const page = contentPages[i]!;
    const text = page.text;
    const nextPage = contentPages[i + 1];

    if (PASSAGE_INTRO_RE.test(text) && currentPassagePages.length > 0) {
      flushPassage();
    }

    if (isQuestionPage(text)) {
      flushPassage();

      const questionText = prepareElaQuestionPageText(text);
      const activePassage = passages[passages.length - 1];
      const rangeStart = activePassage?.questionRangeStart;
      const passageNums = regions
        .filter((r) => (r as { passageNumber?: number }).passageNumber === activePassage?.passageNumber)
        .map((r) => r.problemNumber);
      let localNum =
        passageNums.length > 0
          ? Math.max(...passageNums) + 1
          : (rangeStart ?? nextProblemNumber);

      const footerNum = extractQuestionNumberFromPageFooter(questionText);
      if (footerNum != null) {
        localNum = footerNum;
      }

      if (
        (SHORT_ANSWER_RE.test(questionText) || isConstructedResponseQuestionPage(questionText)) &&
        !pageHasMcqChoices(questionText)
      ) {
        const itemNum = extractNyItemQuestionNumber(questionText);
        if (
          itemNum != null &&
          (activePassage?.questionRangeStart == null ||
            activePassage?.questionRangeEnd == null ||
            (itemNum >= activePassage.questionRangeStart &&
              itemNum <= activePassage.questionRangeEnd))
        ) {
          localNum = itemNum;
        }
        while (assignedProblemNumbers.has(localNum)) localNum++;

        const stem = SHORT_ANSWER_RE.test(questionText)
          ? trimPageToFirstShortAnswer(questionText).slice(0, 2000)
          : trimConstructedResponseStem(questionText);

        assignedProblemNumbers.add(localNum);
        regions.push({
          problemNumber: localNum,
          pageNumber: page.pageNumber,
          rawText: stem,
          cleanedText: stem,
          questionType: "open_response",
          requiresImage: isConstructedResponseQuestionPage(questionText),
          parseWarnings: [
            isConstructedResponseQuestionPage(questionText)
              ? "ELA constructed-response item (use page image)"
              : "ELA short-response item",
          ],
          confidence: 0.85,
          passageNumber: activePassage?.passageNumber,
        } as DetectedProblemRegion & { passageNumber?: number });
        nextProblemNumber = localNum + 1;
        continue;
      }

      const cleaned = cleanPageText(questionText);
      const blocks = splitMcqBlocks(cleaned);
      if (blocks.length === 0) {
        const block = parseSingleQuestionFromPage(questionText);
        if (block) {
          blocks.push({ stem: block.stem, choices: block.choices, questionNumber: null });
        }
      }

      if (blocks.length === 0) {
        const trimmed = trimPageToFirstQuestion(questionText);
        const stemEnd = trimmed.search(CHOICE_A_RE);
        const stemOnly =
          stemEnd > 0 ? normalizeMcqStem(trimmed.slice(0, stemEnd)) : trimmed.slice(0, 500);
        if (!assignedProblemNumbers.has(localNum)) {
          assignedProblemNumbers.add(localNum);
          regions.push({
            problemNumber: localNum,
            pageNumber: page.pageNumber,
            rawText: stemOnly,
            cleanedText: stemOnly,
            questionType: inferQuestionType({
              rawText: trimmed,
              cleanedTextLength: stemOnly.length,
            }),
            requiresImage: true,
            parseWarnings: ["Could not parse MCQ choices — using page image + stem only"],
            confidence: 0.5,
            passageNumber: activePassage?.passageNumber,
          } as DetectedProblemRegion & { passageNumber?: number });
        }
        nextProblemNumber = localNum + 1;
        continue;
      }

      for (const block of blocks) {
        const suggestedNum = block.questionNumber ?? null;
        if (suggestedNum != null) {
          localNum = suggestedNum;
        }

        while (assignedProblemNumbers.has(localNum)) localNum++;

        if (
          activePassage?.questionRangeEnd != null &&
          localNum > activePassage.questionRangeEnd
        ) {
          continue;
        }

        const key = stemKey(block.stem);
        if (assignedStems.has(key)) {
          localNum++;
          continue;
        }

        assignedProblemNumbers.add(localNum);
        assignedStems.add(key);
        regions.push({
          problemNumber: localNum,
          pageNumber: page.pageNumber,
          rawText: `${block.stem}\n${block.choices.map((c) => `${c.label} ${c.text}`).join("\n")}`,
          cleanedText: block.stem,
          questionType: "multiple_choice",
          requiresImage: false,
          parseWarnings: blocks.length > 1 ? ["Multiple questions detected on one page"] : [],
          confidence: 0.9,
          passageNumber: activePassage?.passageNumber,
          elaChoices: block.choices,
        } as DetectedProblemRegion & {
          passageNumber?: number;
          elaChoices?: ParsedChoice[];
        });

        localNum++;
      }

      nextProblemNumber = localNum;
    } else if (isPassagePage(text)) {
      if (currentPassagePages.length === 0 || PASSAGE_INTRO_RE.test(text)) {
        if (PASSAGE_INTRO_RE.test(text) && currentPassagePages.length > 0) {
          flushPassage();
        }
        currentMeta = extractPassageMeta(text);
      }
      currentPassagePages.push(page);
    } else if (isImageOnlyPassagePage(text, nextPage, currentPassagePages.length > 0)) {
      currentPassagePages.push(page);
    }
  }

  flushPassage();

  // Attach passage numbers to regions missing them (questions before first explicit passage)
  if (passages.length === 1 && regions.some((r) => !(r as { passageNumber?: number }).passageNumber)) {
    for (const r of regions) {
      (r as { passageNumber?: number }).passageNumber = 1;
    }
  }

  return {
    passages,
    regions,
    answerKeySection: answerPages.map((p) => p.text).join("\n\n"),
    problemPageCount: contentPages.length,
    answerKeyPageCount: answerPages.length,
  };
}

export type ElaDetectedRegion = DetectedProblemRegion & {
  passageNumber?: number;
  elaChoices?: ParsedChoice[];
};
