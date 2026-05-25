import type { WorkQuality } from "@/lib/stroke-analysis";
import {
  analyzeWorkQuality,
  workQualityBadgeClass,
  workQualityLabel,
} from "@/lib/stroke-analysis";
import type { Stroke } from "@/lib/strokes";

export function resolveAttemptWorkQuality(attempt: {
  showedWork: boolean | null;
  workQualityJson: unknown;
  strokes?: { strokeDataJson: unknown } | null;
  problem: { requiresScratchpad: boolean };
}): WorkQuality {
  if (attempt.workQualityJson && typeof attempt.workQualityJson === "object") {
    return attempt.workQualityJson as WorkQuality;
  }

  const strokes = (attempt.strokes?.strokeDataJson ?? []) as Stroke[];
  return analyzeWorkQuality(strokes);
}

export function WorkQualityBadge({
  quality,
  requiresScratchpad,
}: {
  quality: WorkQuality;
  requiresScratchpad: boolean;
}) {
  const label = workQualityLabel(quality);
  const missingRequired = requiresScratchpad && !quality.showedWork;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        missingRequired
          ? "bg-rose-100 text-rose-800"
          : workQualityBadgeClass(quality)
      }`}
    >
      {missingRequired ? "Required work missing" : label}
    </span>
  );
}
