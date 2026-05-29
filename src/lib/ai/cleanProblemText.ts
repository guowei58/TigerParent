export function cleanProblemText(raw: string): string {
  return raw
    .replace(/\uFFFD/g, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/page\s+\d+/gi, "")
    .replace(/Go on to the next page\.?/gi, "")
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
