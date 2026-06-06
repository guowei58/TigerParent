import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { pdf } from "pdf-to-img";
import { ensureDir, resolveDataPath, toDataRelativePath } from "@/lib/storage/fileStorage";
import { setupPdfJs, getPdfJsDocumentInitParams } from "./setupPdfJs";

export type RenderedPage = {
  pageNumber: number;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
};

export async function renderPdfPages(
  pdfFilePath: string,
  outDir: string,
  scale = 2,
  onProgress?: (renderedPageCount: number) => void | Promise<void>,
): Promise<RenderedPage[]> {
  await setupPdfJs();
  ensureDir(outDir);
  const doc = await pdf(pdfFilePath, {
    scale,
    docInitParams: getPdfJsDocumentInitParams(),
  });
  const pages: RenderedPage[] = [];
  let pageNumber = 1;

  for await (const image of doc) {
    const pngPath = path.join(outDir, `page-${String(pageNumber).padStart(3, "0")}.png`);
    const meta = await sharp(image).png({ compressionLevel: 6 }).toFile(pngPath);
    pages.push({
      pageNumber,
      imagePath: toDataRelativePath(pngPath),
      imageWidth: meta.width,
      imageHeight: meta.height,
    });
    await onProgress?.(pages.length);
    pageNumber++;
    if (pageNumber % 5 === 0) {
      console.log(`[pdf-render] ${pageNumber} pages...`);
    }
  }

  if (pages.length === 0) {
    throw new Error("PDF rendered zero pages");
  }

  return pages;
}

export async function cropProblemImage(
  sourcePagePath: string,
  outPath: string,
  crop: { x: number; y: number; width: number; height: number },
): Promise<void> {
  ensureDir(path.dirname(resolveDataPath(outPath)));
  await sharp(resolveDataPath(sourcePagePath))
    .extract({
      left: Math.max(0, Math.floor(crop.x)),
      top: Math.max(0, Math.floor(crop.y)),
      width: Math.max(1, Math.floor(crop.width)),
      height: Math.max(1, Math.floor(crop.height)),
    })
    .png()
    .toFile(resolveDataPath(outPath));
}

export type TrimWhitespaceResult = {
  width: number;
  height: number;
  trimmed: boolean;
};

/** Pixels darker than this are treated as problem content (text, diagrams). */
const INK_LUMINANCE_MAX = 248;
const ROW_INK_THRESHOLD = 12;
/** Blank rows after content before we stop scanning (ignores page border at bottom). */
const BLANK_ROW_GAP = 48;
const SIDE_MARGIN_RATIO = 0.04;

function rowInkCount(
  data: Buffer,
  width: number,
  channels: number,
  y: number,
  xMargin: number,
): number {
  let ink = 0;
  for (let x = xMargin; x < width - xMargin; x++) {
    const i = (y * width + x) * channels;
    const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    if (lum < INK_LUMINANCE_MAX) ink++;
  }
  return ink;
}

function findContentBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { left: number; top: number; right: number; bottom: number } | null {
  const xMargin = Math.max(8, Math.floor(width * SIDE_MARGIN_RATIO));
  const rowInks = Array.from({ length: height }, (_, y) =>
    rowInkCount(data, width, channels, y, xMargin),
  );

  let top = -1;
  for (let y = 0; y < height; y++) {
    if (rowInks[y]! >= ROW_INK_THRESHOLD) {
      top = y;
      break;
    }
  }
  if (top < 0) return null;

  let bottom = top;
  let blankRun = 0;
  for (let y = top; y < height; y++) {
    if (rowInks[y]! >= ROW_INK_THRESHOLD) {
      bottom = y;
      blankRun = 0;
    } else {
      blankRun++;
      if (blankRun >= BLANK_ROW_GAP) break;
    }
  }

  let left = width;
  let right = -1;
  for (let y = top; y <= bottom; y++) {
    for (let x = xMargin; x < width - xMargin; x++) {
      const i = (y * width + x) * channels;
      const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      if (lum < INK_LUMINANCE_MAX) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  if (right < left) return null;
  return { left, top, right, bottom };
}

/**
 * Remove blank margins (common when a problem only uses part of a PDF page).
 */
export async function trimImageWhitespace(
  imagePath: string,
  options?: { padding?: number },
): Promise<TrimWhitespaceResult> {
  const abs = resolveDataPath(imagePath);
  const before = await sharp(abs).metadata();
  if (!before.width || !before.height) {
    return { width: 0, height: 0, trimmed: false };
  }

  const padding = options?.padding ?? 20;

  try {
    const { data, info } = await sharp(abs)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bounds = findContentBounds(data, info.width, info.height, info.channels);
    if (!bounds) {
      return { width: before.width, height: before.height, trimmed: false };
    }

    const cropLeft = bounds.left;
    const cropTop = bounds.top;
    const cropWidth = bounds.right - bounds.left + 1;
    const cropHeight = bounds.bottom - bounds.top + 1;

    const heightSaved = before.height - cropHeight;
    const widthSaved = before.width - cropWidth;
    const minSave = 0.02;
    if (heightSaved < before.height * minSave && widthSaved < before.width * minSave) {
      return { width: before.width, height: before.height, trimmed: false };
    }

    const areaBefore = before.width * before.height;
    const areaAfter = cropWidth * cropHeight;
    if (areaAfter < areaBefore * 0.1) {
      return { width: before.width, height: before.height, trimmed: false };
    }

    const tmp = `${abs}.trim-tmp.png`;
    const { width, height } = await sharp(abs)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png({ compressionLevel: 6 })
      .toFile(tmp);

    await fs.rename(tmp, abs);
    return { width, height, trimmed: true };
  } catch {
    return { width: before.width, height: before.height, trimmed: false };
  }
}
