import path from "path";
import { cropProblemImage } from "./renderPdfPages";
import type { DetectedProblemRegion } from "./detectProblems";
import { ensureDir, pdfCropsDir, toDataRelativePath } from "@/lib/storage/fileStorage";

export type ProblemCropResult = {
  problemNumber: number;
  problemImagePath: string;
  fullPageImagePath: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  studentDisplayMode: "image_crop" | "full_page_with_problem_number";
  confidence: number;
  warnings: string[];
};

/**
 * Vertical slice: assign each problem the full page image as crop (faithful display).
 * Future: refine Y-bounds using text positions.
 */
export async function cropProblemImages(
  sourceDocumentId: string,
  regions: DetectedProblemRegion[],
  pageImages: Map<number, { path: string; width: number; height: number }>,
): Promise<ProblemCropResult[]> {
  const outDir = pdfCropsDir(sourceDocumentId);
  ensureDir(outDir);
  const results: ProblemCropResult[] = [];

  for (const region of regions) {
    const page = pageImages.get(region.pageNumber);
    if (!page) continue;

    const warnings = [...region.parseWarnings];
    const crop = {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    };

    const cropFileName = `problem-${String(region.problemNumber).padStart(3, "0")}.png`;
    const cropAbsPath = path.join(outDir, cropFileName);
    const cropPath = toDataRelativePath(cropAbsPath);
    const fullPagePath = toDataRelativePath(page.path);

    await cropProblemImage(fullPagePath, cropPath, crop);

    // Full-page crop preserves diagrams, figures, and answer choices in the PDF image.
    const displayMode: ProblemCropResult["studentDisplayMode"] = "image_crop";

    results.push({
      problemNumber: region.problemNumber,
      problemImagePath: cropPath,
      fullPageImagePath: fullPagePath,
      cropX: crop.x,
      cropY: crop.y,
      cropWidth: crop.width,
      cropHeight: crop.height,
      studentDisplayMode: displayMode,
      confidence: region.confidence,
      warnings,
    });
  }

  return results;
}
