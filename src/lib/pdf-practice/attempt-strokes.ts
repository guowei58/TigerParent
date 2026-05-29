import {
  analyzeWorkQuality,
  type WorkQuality,
} from "@/lib/stroke-analysis";
import { parseStrokes, type Stroke } from "@/lib/strokes";

/** PDF topic practice always requires scratch work before submit or skip. */
export const PDF_PRACTICE_REQUIRES_SCRATCHPAD = true;

export function parsePdfAttemptStrokes(
  raw: unknown,
  drawingSeconds?: number,
): { strokes: Stroke[]; quality: WorkQuality } {
  const strokes = parseStrokes(raw);
  const quality = analyzeWorkQuality(strokes, { drawingSeconds });
  return { strokes, quality };
}

export function pdfAttemptStrokeCreate(
  strokes: Stroke[],
  drawingSeconds?: number,
) {
  if (strokes.length === 0) return undefined;
  return {
    create: {
      strokeDataJson: strokes,
      drawingSeconds: drawingSeconds ?? null,
    },
  };
}

export function resolvePdfAttemptWorkQuality(attempt: {
  showedWork?: boolean | null;
  workQualityJson?: unknown;
  strokes?: { strokeDataJson: unknown; drawingSeconds?: number | null } | null;
}): WorkQuality {
  if (attempt.workQualityJson && typeof attempt.workQualityJson === "object") {
    return attempt.workQualityJson as WorkQuality;
  }
  const strokes = parseStrokes(attempt.strokes?.strokeDataJson);
  return analyzeWorkQuality(strokes, {
    drawingSeconds: attempt.strokes?.drawingSeconds ?? undefined,
  });
}
