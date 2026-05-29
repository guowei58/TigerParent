import { publicPathFromData } from "@/lib/storage/fileStorage";

export function assetUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;
  return publicPathFromData(storedPath);
}

/** Show the rendered PDF page as-is (no masking or trimming). */
export function problemDisplayImagePath(problem: {
  problemImagePath: string | null;
  fullPageImagePath: string | null;
}): string | null {
  return problem.fullPageImagePath ?? problem.problemImagePath;
}
