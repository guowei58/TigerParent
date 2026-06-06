import { assetUrl } from "@/lib/pdf/displayPaths";

export type PdfPassageView = {
  title: string | null;
  promptText: string | null;
  bodyText: string | null;
  pageImageUrls: string[];
  /** Render scanned PDF pages when available — preserves original layout. */
  displayMode: "page_images" | "text";
};

export function passageViewFromDb(
  passage: {
    title: string | null;
    promptText: string | null;
    bodyText: string | null;
    pageImagePaths: unknown;
    updatedAt?: Date | string;
  },
): PdfPassageView {
  const paths = Array.isArray(passage.pageImagePaths)
    ? (passage.pageImagePaths as string[])
    : [];
  const cacheKey =
    passage.updatedAt instanceof Date
      ? passage.updatedAt.getTime()
      : passage.updatedAt
        ? new Date(passage.updatedAt).getTime()
        : null;
  const pageImageUrls = paths
    .map((p) => assetUrl(p, cacheKey))
    .filter((u): u is string => Boolean(u));
  return {
    title: passage.title,
    promptText: passage.promptText,
    bodyText: passage.bodyText,
    pageImageUrls,
    displayMode: pageImageUrls.length > 0 ? "page_images" : "text",
  };
}
