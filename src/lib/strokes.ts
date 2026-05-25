export type StrokePoint = { x: number; y: number; pressure?: number };
export type Stroke = { points: StrokePoint[]; color: string; width: number };

export function strokesToJson(strokes: Stroke[]): string {
  return JSON.stringify(strokes);
}

export function parseStrokes(raw: unknown): Stroke[] {
  if (!Array.isArray(raw)) return [];
  return raw as Stroke[];
}
