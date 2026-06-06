export type ElaTextExtractionQuality = {
  contentPageCount: number;
  nonEmptyPageCount: number;
  nonEmptyRatio: number;
  totalContentChars: number;
  /** True when PDF text is too sparse for reliable ELA passage/question detection. */
  needsVisionFallback: boolean;
};

const MIN_MEANINGFUL_PAGE_CHARS = 80;

/**
 * Heuristic: NY ELA PDFs with selectable text usually have readable text on most pages.
 * Scanned PDFs (e.g. 2016) often have 0–1 non-empty pages besides the answer key.
 */
export function assessElaTextExtraction(
  pages: { pageNumber: number; text: string }[],
  answerKeyPageCount: number,
): ElaTextExtractionQuality {
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const maxPage = sorted[sorted.length - 1]?.pageNumber ?? 0;
  const trailing = Math.max(1, Math.min(answerKeyPageCount, maxPage));
  const firstAnswerPage = maxPage - trailing + 1;

  const contentPages = sorted.filter((p) => p.pageNumber < firstAnswerPage);
  const nonEmpty = contentPages.filter((p) => p.text.trim().length >= MIN_MEANINGFUL_PAGE_CHARS);
  const totalContentChars = contentPages.reduce((sum, p) => sum + p.text.trim().length, 0);
  const nonEmptyRatio =
    contentPages.length > 0 ? nonEmpty.length / contentPages.length : 0;

  const needsVisionFallback =
    contentPages.length >= 5 &&
    (nonEmptyRatio < 0.2 ||
      (nonEmpty.length <= 2 && totalContentChars < 800));

  return {
    contentPageCount: contentPages.length,
    nonEmptyPageCount: nonEmpty.length,
    nonEmptyRatio,
    totalContentChars,
    needsVisionFallback,
  };
}

/**
 * Use vision/heuristic fallback when text detection found almost nothing
 * but the answer key suggests many items exist.
 */
export function shouldUseElaScannedFallback(
  quality: ElaTextExtractionQuality,
  detectedQuestionCount: number,
  answerKeyEntryCount: number,
): boolean {
  if (!quality.needsVisionFallback) return false;
  if (detectedQuestionCount === 0 && answerKeyEntryCount >= 3) return true;
  if (
    answerKeyEntryCount >= 5 &&
    detectedQuestionCount < answerKeyEntryCount * 0.35
  ) {
    return true;
  }
  return false;
}
