"use client";

import { StrokeViewer } from "@/components/StrokeViewer";
import type { Stroke } from "@/lib/strokes";

export function ScratchWorkPreview({
  strokeData,
  className = "",
}: {
  strokeData: unknown;
  className?: string;
}) {
  const strokes = (Array.isArray(strokeData) ? strokeData : []) as Stroke[];
  const hasStrokes = strokes.some((s) => (s.points?.length ?? 0) >= 2);

  if (!hasStrokes) {
    return (
      <div
        className={`flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs text-slate-500 ${className}`}
      >
        No scratch work saved for this attempt
      </div>
    );
  }

  return (
    <StrokeViewer
      strokeData={strokeData}
      width={320}
      height={144}
      className={`h-36 w-full ${className}`}
    />
  );
}
