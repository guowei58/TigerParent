export function popQuizProblemCount(skillCount: number): number {
  if (skillCount <= 0) return 0;
  return Math.min(Math.max(skillCount * 2, 4), 15);
}
