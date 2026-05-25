import { CORRECT_ROASTS, WRONG_ROASTS } from "./lines";

export type RoastUsage = {
  correct: number[];
  wrong: number[];
};

function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function pickFromPool(
  pool: readonly string[],
  used: number[],
): { index: number; line: string; used: number[] } {
  const all = Array.from({ length: pool.length }, (_, i) => i);
  const remaining = all.filter((i) => !used.includes(i));

  if (remaining.length === 0) {
    const next = shuffleIndices(pool.length)[0];
    return { index: next, line: pool[next], used: [next] };
  }

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  return { index: pick, line: pool[pick], used: [...used, pick] };
}

export function pickTigerParentRoast(
  isCorrect: boolean,
  usage: RoastUsage | undefined,
): { roast: string; usage: RoastUsage } {
  const current: RoastUsage = {
    correct: usage?.correct ?? [],
    wrong: usage?.wrong ?? [],
  };

  if (isCorrect) {
    const { index, line, used } = pickFromPool(CORRECT_ROASTS, current.correct);
    return {
      roast: line,
      usage: { ...current, correct: used },
    };
  }

  const { index, line, used } = pickFromPool(WRONG_ROASTS, current.wrong);
  return {
    roast: line,
    usage: { ...current, wrong: used },
  };
}

export function roastPoolStats() {
  return {
    correct: CORRECT_ROASTS.length,
    wrong: WRONG_ROASTS.length,
    total: CORRECT_ROASTS.length + WRONG_ROASTS.length,
  };
}

export { CORRECT_ROASTS, WRONG_ROASTS };
