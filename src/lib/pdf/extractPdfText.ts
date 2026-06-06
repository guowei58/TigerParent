import fs from "fs";
import { setupPdfJs } from "./setupPdfJs";
import {
  buildPageTextFromLines,
  groupPositionedItemsIntoLines,
} from "./pageTextReadingOrder";
import { positionedItemsFromTextContent } from "./positionedTextItems";

export type PageText = {
  pageNumber: number;
  text: string;
};

/** PostgreSQL text columns reject NUL (0x00) bytes. */
export function sanitizePdfText(text: string): string {
  return text.replace(/\u0000/g, "");
}

async function loadPdfDocument(filePath: string) {
  await setupPdfJs();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));
  return pdfjs.getDocument({ data, useSystemFonts: true }).promise;
}

function pageLooksLikeMcq(text: string): boolean {
  return (
    /\bA\s+[\u201c\u201d"'([A-Za-z]/.test(text) &&
    /\bB\s+[\u201c\u201d"'([A-Za-z]/.test(text) &&
    /\bC\s+[\u201c\u201d"'([A-Za-z]/.test(text) &&
    /\bD\s+[\u201c\u201d"'([A-Za-z]/.test(text)
  );
}

/**
 * Extract each page's text in visual reading order (top-to-bottom, left-to-right).
 * PDF content-stream order often interleaves footer/bleed fragments from adjacent items.
 */
export async function extractPdfTextByPage(filePath: string): Promise<PageText[]> {
  const doc = await loadPdfDocument(filePath);
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pages: PageText[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = positionedItemsFromTextContent(content, viewport, pdfjs.Util);
      const lines = groupPositionedItemsIntoLines(items);
      const baseText = buildPageTextFromLines(lines, viewport.height, { stripFooter: true });
      const text = buildPageTextFromLines(lines, viewport.height, {
        stripFooter: true,
        stripLeadingChoiceBleed: pageLooksLikeMcq(baseText),
      });
      pages.push({
        pageNumber,
        text: sanitizePdfText(text),
      });
    }
    return pages.length > 0 ? pages : [{ pageNumber: 1, text: "" }];
  } finally {
    await doc.destroy();
  }
}

export async function extractPdfText(filePath: string): Promise<string> {
  const pages = await extractPdfTextByPage(filePath);
  return pages.map((p) => p.text).join("\n\n");
}
