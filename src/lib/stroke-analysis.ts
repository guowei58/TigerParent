import type { Stroke } from "./strokes";

export type InkLevel = "none" | "low" | "medium" | "high";

export type WorkQuality = {
  strokeCount: number;
  pointCount: number;
  totalPathLength: number;
  boundingArea: number;
  drawingSeconds: number;
  inkLevel: InkLevel;
  showedWork: boolean;
};

const MIN_PATH_LENGTH = 40;
const MIN_POINTS = 4;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function inkLevelFromMetrics(
  strokeCount: number,
  totalPathLength: number,
): InkLevel {
  if (strokeCount === 0 || totalPathLength < MIN_PATH_LENGTH) return "none";
  if (totalPathLength < 120) return "low";
  if (totalPathLength < 300) return "medium";
  return "high";
}

export function analyzeWorkQuality(
  strokes: Stroke[],
  options?: { drawingSeconds?: number },
): WorkQuality {
  let pointCount = 0;
  let totalPathLength = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    const points = stroke.points ?? [];
    pointCount += points.length;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      if (i > 0) {
        totalPathLength += distance(points[i - 1], p);
      }
    }
  }

  const strokeCount = strokes.filter((s) => (s.points?.length ?? 0) >= 2).length;
  const boundingArea =
    strokeCount === 0 || !Number.isFinite(minX)
      ? 0
      : Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
  const inkLevel = inkLevelFromMetrics(strokeCount, totalPathLength);
  const showedWork =
    strokeCount >= 1 &&
    pointCount >= MIN_POINTS &&
    totalPathLength >= MIN_PATH_LENGTH;

  return {
    strokeCount,
    pointCount,
    totalPathLength: Math.round(totalPathLength),
    boundingArea: Math.round(boundingArea),
    drawingSeconds: Math.round((options?.drawingSeconds ?? 0) * 10) / 10,
    inkLevel,
    showedWork,
  };
}

export function getWorkBonusXp(
  quality: WorkQuality,
  requiresScratchpad: boolean,
): number {
  if (!quality.showedWork) return 0;
  if (requiresScratchpad) return 3;
  return 1;
}

export function getWorkFeedback(
  quality: WorkQuality,
  requiresScratchpad: boolean,
): string | null {
  if (requiresScratchpad && quality.showedWork) {
    return "Good — you showed your work on the scratchpad.";
  }
  if (requiresScratchpad && !quality.showedWork) {
    return "Use the scratchpad to show your work before submitting.";
  }
  if (quality.showedWork) {
    return "Bonus: nice use of the scratchpad!";
  }
  return null;
}

export function workQualityLabel(quality: WorkQuality): string {
  if (!quality.showedWork) return "No work shown";
  if (quality.inkLevel === "low") return "Minimal scratch work";
  if (quality.inkLevel === "medium") return "Showed work";
  return "Detailed scratch work";
}

export function workQualityBadgeClass(quality: WorkQuality): string {
  if (!quality.showedWork) return "bg-amber-100 text-amber-800";
  if (quality.inkLevel === "high") return "bg-emerald-100 text-emerald-800";
  return "bg-indigo-100 text-indigo-800";
}
