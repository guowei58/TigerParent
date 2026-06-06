"use client";

import type { PdfPassageView } from "@/lib/pdf/passageView";

export type { PdfPassageView };

export function PdfPassagePanel({
  passage,
  variant = "compact",
}: {
  passage: PdfPassageView;
  variant?: "compact" | "student";
}) {
  const usePageImages = passage.displayMode === "page_images" && passage.pageImageUrls.length > 0;

  return (
    <div
      className={
        variant === "student"
          ? "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-3 max-h-[min(72vh,720px)] overflow-y-auto"
          : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-3 max-h-[min(42vh,420px)] overflow-y-auto"
      }
    >
      {!usePageImages && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Reading passage
          </p>
          {passage.title && (
            <p className="mt-1 text-sm font-semibold text-slate-900">{passage.title}</p>
          )}
          {passage.promptText && (
            <p className="mt-1 text-xs text-slate-600 italic">{passage.promptText}</p>
          )}
        </div>
      )}

      {usePageImages ? (
        <div className="space-y-2">
          {passage.pageImageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={passage.title ? `Reading passage: ${passage.title}` : "Reading passage"}
              className="block w-full rounded-sm"
            />
          ))}
        </div>
      ) : passage.bodyText ? (
        <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-serif">
          {passage.bodyText}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Passage text is not available.</p>
      )}
    </div>
  );
}
