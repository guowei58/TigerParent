import fs from "fs/promises";
import sharp from "sharp";
import { resolveDataPath } from "@/lib/storage/fileStorage";
import {
  findFirstProblemNumberRect,
  getPagePositionedTextItems,
  type PixelRect,
} from "./positionedTextItems";

export type MaskResult = {
  masked: boolean;
  rect: PixelRect | null;
};

export async function maskFirstProblemNumberOnImage(
  imagePath: string,
  pdfFilePath: string,
  pageNumber: number,
  renderScale: number,
): Promise<MaskResult> {
  const abs = resolveDataPath(imagePath);
  const meta = await sharp(abs).metadata();
  if (!meta.width || !meta.height) {
    return { masked: false, rect: null };
  }

  const items = await getPagePositionedTextItems(pdfFilePath, pageNumber, renderScale);
  const rect = findFirstProblemNumberRect(items, meta.height);
  if (!rect) {
    return { masked: false, rect: null };
  }

  const clamped: PixelRect = {
    left: Math.min(rect.left, meta.width - 1),
    top: Math.min(rect.top, meta.height - 1),
    width: Math.min(rect.width, meta.width - rect.left),
    height: Math.min(rect.height, meta.height - rect.top),
  };

  if (clamped.width < 4 || clamped.height < 4) {
    return { masked: false, rect: null };
  }

  const tmp = `${abs}.masked.png`;
  await sharp(abs)
    .composite([
      {
        input: {
          create: {
            width: clamped.width,
            height: clamped.height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        },
        left: clamped.left,
        top: clamped.top,
      },
    ])
    .png({ compressionLevel: 6 })
    .toFile(tmp);

  await fs.rename(tmp, abs);
  return { masked: true, rect: clamped };
}
