import fs from "fs";
import { setupPdfJs } from "./setupPdfJs";

export type PositionedTextItem = {
  str: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type PdfTextItem = {
  str?: string;
  transform: number[];
  width: number;
  height: number;
};

/** Standalone problem index at line start: "4", "4.", "10." */
const PROBLEM_NUMBER_RE = /^(\d{1,3})(\.)?$/;

function itemBounds(
  item: PdfTextItem,
  viewport: { transform: number[] },
  util: { transform: (m1: number[], m2: number[]) => number[] },
): PositionedTextItem | null {
  const str = item.str?.trim() ?? "";
  if (!str) return null;

  const tx = util.transform(viewport.transform, item.transform);
  const fontSize = Math.hypot(tx[0], tx[1]);
  if (fontSize < 4 || fontSize > 80) return null;

  const left = tx[4];
  const top = tx[5] - fontSize;
  const width = Math.min(item.width * fontSize, fontSize * Math.max(str.length, 1) * 0.75);
  const height = fontSize * 1.25;

  return {
    str,
    left,
    top,
    width: Math.max(width, fontSize * 0.4),
    height,
  };
}

export async function getPagePositionedTextItems(
  pdfFilePath: string,
  pageNumber: number,
  scale: number,
): Promise<PositionedTextItem[]> {
  await setupPdfJs();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfFilePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  try {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const content = await page.getTextContent();
    const items: PositionedTextItem[] = [];

    for (const raw of content.items as PdfTextItem[]) {
      const bounds = itemBounds(raw, viewport, pdfjs.Util);
      if (bounds) items.push(bounds);
    }

    return items;
  } finally {
    await doc.destroy();
  }
}

export type PixelRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** First standalone digits (e.g. "4.") in reading order near the top of the page. */
export function findFirstProblemNumberRect(
  items: PositionedTextItem[],
  pageHeight: number,
): PixelRect | null {
  const topBand = pageHeight * 0.35;
  const sorted = [...items]
    .filter((item) => item.top < topBand && item.width <= 100 && item.height <= 60)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]!;
    const match = item.str.match(PROBLEM_NUMBER_RE);
    if (!match) continue;

    let left = item.left;
    let top = item.top;
    let right = left + item.width;
    let bottom = top + item.height;

    const next = sorted[i + 1];
    if (
      !match[2] &&
      next &&
      next.str === "." &&
      next.top - top < item.height * 1.5 &&
      next.left >= right - 2 &&
      next.left < right + item.height * 2
    ) {
      right = next.left + next.width;
      i++;
    }

    const pad = 3;
    return {
      left: Math.max(0, Math.floor(left - pad)),
      top: Math.max(0, Math.floor(top - pad)),
      width: Math.min(120, Math.ceil(right - left + pad * 2)),
      height: Math.min(56, Math.ceil(bottom - top + pad * 2)),
    };
  }

  return null;
}
