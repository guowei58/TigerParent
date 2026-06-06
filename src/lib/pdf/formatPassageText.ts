/** Normalize one passage page of extracted PDF text without destroying layout. */
export function normalizePassagePageText(text: string): string {
  return text
    .replace(/\n--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\bPage\s+\d+\s+Session\s+\d+/gi, "")
    .replace(/\bGO ON\b|\bSTOP\b/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Join passage pages for storage / AI — keeps paragraph breaks and numbering. */
export function formatPassageBodyText(pages: { text: string }[]): string {
  return pages
    .map((p) => normalizePassagePageText(p.text))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);
}
