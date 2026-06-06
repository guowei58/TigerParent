import { publicPathFromData, toDataRelativePath } from "@/lib/storage/dataPaths";
import { pdfAssetsPublicBaseUrl } from "@/lib/storage/r2Config";

export function assetUrl(
  storedPath: string | null | undefined,
  cacheKey?: string | number | null,
): string | null {
  if (!storedPath) return null;
  const relative = toDataRelativePath(storedPath);
  const cdnBase = pdfAssetsPublicBaseUrl();
  const base = cdnBase ? `${cdnBase}/${relative}` : publicPathFromData(storedPath);
  if (cacheKey == null || cacheKey === "") return base;
  return `${base}?v=${encodeURIComponent(String(cacheKey))}`;
}

/** Prefer trimmed problem crop; fall back to full page when no crop exists. */
export function problemDisplayImagePath(problem: {
  problemImagePath: string | null;
  fullPageImagePath: string | null;
}): string | null {
  return problem.problemImagePath ?? problem.fullPageImagePath;
}

/** ELA reading: show the full question page (passage is shown separately). */
export function elaQuestionDisplayImagePath(problem: {
  problemImagePath: string | null;
  fullPageImagePath: string | null;
  passageId?: string | null;
}): string | null {
  if (problem.passageId && problem.fullPageImagePath) {
    return problem.fullPageImagePath;
  }
  return problemDisplayImagePath(problem);
}
