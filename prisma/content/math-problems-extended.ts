import type { ContentProblem } from "./types";
import { createRng, randInt } from "./rng";

const MATH_SOURCE =
  "CCSS-aligned fluency drills; original items (EngageNY/Illustrative Math formats)";

function p(
  partial: Omit<
    ContentProblem,
    "gradeLevel" | "sourceAttribution" | "requiresScratchpad" | "mistakeCategoriesJson"
  > & {
    gradeLevel?: number;
    requiresScratchpad?: boolean;
    mistakeCategoriesJson?: string[];
  },
  grade: number,
): ContentProblem {
  return {
    ...partial,
    gradeLevel: partial.gradeLevel ?? grade,
    sourceAttribution: MATH_SOURCE,
    requiresScratchpad: partial.requiresScratchpad ?? true,
    mistakeCategoriesJson: partial.mistakeCategoriesJson ?? ["fact_error"],
  };
}

function shufflePairs(rng: () => number, pairs: [number, number][]) {
  const copy = [...pairs];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function additionFacts(maxSum: number, grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const pairs: [number, number][] = [];
  for (let a = 0; a <= maxSum; a++) {
    for (let b = 0; b <= maxSum; b++) {
      if (a + b <= maxSum) pairs.push([a, b]);
    }
  }
  const shuffled = shufflePairs(rng, pairs);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = shuffled[i % shuffled.length];
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} + ${b} = ?`,
          correctAnswer: String(a + b),
          explanation: `${a} + ${b} = ${a + b}.`,
          difficulty: a + b <= 10 ? 1 : 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function subtractionFacts(max: number, grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const pairs: [number, number][] = [];
  for (let a = 0; a <= max; a++) {
    for (let b = 0; b <= a; b++) pairs.push([a, b]);
  }
  const shuffled = shufflePairs(rng, pairs);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = shuffled[i % shuffled.length];
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} − ${b} = ?`,
          correctAnswer: String(a - b),
          explanation: `${a} − ${b} = ${a - b}.`,
          difficulty: a <= 10 ? 1 : 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function multiplicationFacts(
  tables: number[],
  grade: number,
  count: number,
  seed: number,
) {
  const rng = createRng(seed);
  const pairs: [number, number][] = [];
  for (const t of tables) {
    for (let b = 0; b <= 12; b++) pairs.push([t, b]);
  }
  const shuffled = shufflePairs(rng, pairs);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = shuffled[i % shuffled.length];
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} × ${b} = ?`,
          correctAnswer: String(a * b),
          explanation: `${a} × ${b} = ${a * b}.`,
          difficulty: 1 + Math.min(2, Math.floor((a + b) / 10)),
        },
        grade,
      ),
    );
  }
  return problems;
}

function divisionFacts(
  divisors: number[],
  grade: number,
  count: number,
  seed: number,
) {
  const rng = createRng(seed);
  const triples: [number, number, number][] = [];
  for (const d of divisors) {
    for (let q = 0; q <= 12; q++) {
      triples.push([d * q, d, q]);
    }
  }
  for (let i = triples.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [triples[i], triples[j]] = [triples[j], triples[i]];
  }
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b, q] = triples[i % triples.length];
    if (b === 0) continue;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} ÷ ${b} = ?`,
          correctAnswer: String(q),
          explanation: `${a} ÷ ${b} = ${q} because ${b} × ${q} = ${a}.`,
          difficulty: 2,
          mistakeCategoriesJson: ["fact_error", "inverse_error"],
        },
        grade,
      ),
    );
  }
  while (problems.length < count) {
    problems.push(...divisionFacts(divisors, grade, count - problems.length, seed + 99));
  }
  return problems.slice(0, count);
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function pickDenom(rng: () => number) {
  const ds = [2, 3, 4, 5, 6, 8, 10, 12];
  return ds[Math.floor(rng() * ds.length)];
}

function pickPct(rng: () => number) {
  return [10, 15, 20, 25, 50][Math.floor(rng() * 5)];
}

function formatTime(h: number, totalMin: number) {
  let mins = totalMin;
  let hour = h;
  while (mins >= 60) {
    mins -= 60;
    hour += 1;
  }
  if (hour > 12) hour -= 12;
  return `${hour}:${String(mins).padStart(2, "0")}`;
}

export const MATH_FACT_BUILDERS: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Addition Facts to 10": (g, c, s) => additionFacts(10, g, c, s),
  "Addition Facts to 20": (g, c, s) => additionFacts(20, g, c, s),
  "Subtraction Facts to 10": (g, c, s) => subtractionFacts(10, g, c, s),
  "Subtraction Facts to 20": (g, c, s) => subtractionFacts(20, g, c, s),
  "Multiplication ×0, ×1, ×2, ×5": (g, c, s) => multiplicationFacts([0, 1, 2, 5], g, c, s),
  "Multiplication ×3 & ×4": (g, c, s) => multiplicationFacts([3, 4], g, c, s),
  "Multiplication ×6 & ×7": (g, c, s) => multiplicationFacts([6, 7], g, c, s),
  "Multiplication ×8 & ×9": (g, c, s) => multiplicationFacts([8, 9], g, c, s),
  "Multiplication ×10, ×11, ×12": (g, c, s) => multiplicationFacts([10, 11, 12], g, c, s),
  "Multiplication Mixed 0–12": (g, c, s) =>
    multiplicationFacts([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], g, c, s),
  "Division ÷2–÷5": (g, c, s) => divisionFacts([2, 3, 4, 5], g, c, s),
  "Division ÷6–÷9": (g, c, s) => divisionFacts([6, 7, 8, 9], g, c, s),
  "Division ÷10–÷12": (g, c, s) => divisionFacts([10, 11, 12], g, c, s),
  "Division Mixed": (g, c, s) =>
    divisionFacts([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], g, c, s),
};

function rounding(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const n = randInt(rng, 100, 9999);
    const round10 = Math.round(n / 10) * 10;
    const round100 = Math.round(n / 100) * 100;
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Round ${n} to the nearest 10.`,
            correctAnswer: String(round10),
            explanation: `${n} → ${round10}.`,
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Round ${n} to the nearest 100.`,
            correctAnswer: String(round100),
            explanation: `${n} → ${round100}.`,
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function perimeter(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const l = randInt(rng, 3, 20);
    const w = randInt(rng, 2, 15);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `Rectangle: length ${l} cm, width ${w} cm. Perimeter = ? cm`,
          correctAnswer: String(2 * (l + w)),
          explanation: `P = 2(l+w) = ${2 * (l + w)}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function tellingTime(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const h = randInt(rng, 1, 12);
    const m = randInt(rng, 0, 11) * 5;
    const elapsed = randInt(rng, 15, 120);
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Movie starts ${h}:${String(m).padStart(2, "0")}, lasts ${elapsed} min. End time? (H:MM)`,
            correctAnswer: formatTime(h, m + elapsed),
            explanation: `Add ${elapsed} minutes.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Minutes from ${h}:00 to ${h}:45?`,
            correctAnswer: "45",
            explanation: "45 minutes.",
            difficulty: 1,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function dataGraphs(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const vals = Array.from({ length: 4 }, () => randInt(rng, 2, 12));
    const labels = ["Red", "Blue", "Green", "Yellow"];
    const total = vals.reduce((s, v) => s + v, 0);
    const maxIdx = vals.indexOf(Math.max(...vals));
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Graph: ${labels.map((l, j) => `${l}=${vals[j]}`).join(", ")}. Total?`,
            correctAnswer: String(total),
            explanation: `${vals.join("+")} = ${total}.`,
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Graph: ${labels.map((l, j) => `${l}=${vals[j]}`).join(", ")}. Most?`,
            correctAnswer: labels[maxIdx],
            explanation: `${labels[maxIdx]} is highest.`,
            difficulty: 1,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function oneStepWord(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, 10, 80);
    const b = randInt(rng, 5, 40);
    if (i % 3 === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} stickers + ${b} more = ?`,
            correctAnswer: String(a + b),
            explanation: `${a + b}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else if (i % 3 === 1) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} apples − ${b} eaten = ? left`,
            correctAnswer: String(a - b),
            explanation: `${a - b}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const groups = randInt(rng, 3, 8);
      const each = randInt(rng, 4, 9);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${groups} bags × ${each} marbles = ?`,
            correctAnswer: String(groups * each),
            explanation: `${groups * each}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function twoStepWord(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const packs = randInt(rng, 3, 7);
    const each = randInt(rng, 6, 12);
    const given = randInt(rng, 5, 20);
    const total = packs * each;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${packs} boxes × ${each} cookies; sell ${given}. Left?`,
          correctAnswer: String(total - given),
          explanation: `${total} − ${given} = ${total - given}.`,
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function multiDigitAddOnly(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 100, 9999);
    const b = randInt(rng, 100, 9999);
    return p(
      {
        type: "NUMERIC",
        prompt: `${a} + ${b} = ?`,
        correctAnswer: String(a + b),
        explanation: `${a + b}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function multiDigitSubOnly(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, 500, 9999);
    const b = randInt(rng, 100, a - 1);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} − ${b} = ?`,
          correctAnswer: String(a - b),
          explanation: `${a - b}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function mul2x1(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 10, 99);
    const b = randInt(rng, 2, 9);
    return p(
      {
        type: "NUMERIC",
        prompt: `${a} × ${b} = ?`,
        correctAnswer: String(a * b),
        explanation: `${a * b}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function mul2x2(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 10, 99);
    const b = randInt(rng, 10, 99);
    return p(
      {
        type: "NUMERIC",
        prompt: `${a} × ${b} = ?`,
        correctAnswer: String(a * b),
        explanation: `${a * b}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function longDivNoRem(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const d = randInt(rng, 2, 9);
    const q = randInt(rng, 10, 99);
    const a = d * q;
    return p(
      {
        type: "NUMERIC",
        prompt: `${a} ÷ ${d} = ?`,
        correctAnswer: String(q),
        explanation: `${d}×${q}=${a}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function longDivRem(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const d = randInt(rng, 3, 9);
    const q = randInt(rng, 10, 50);
    const r = randInt(rng, 1, d - 1);
    const a = d * q + r;
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `${a} ÷ ${d} = ? R ?`,
          correctAnswer: `${q} R ${r}`,
          acceptableAnswersJson: [`${q} r ${r}`],
          explanation: `Quotient ${q}, remainder ${r}.`,
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function factorsMultiples(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const n = randInt(rng, 12, 48);
    const factors: number[] = [];
    for (let f = 1; f <= n; f++) if (n % f === 0) factors.push(f);
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `How many factors does ${n} have?`,
            correctAnswer: String(factors.length),
            explanation: factors.join(", "),
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else {
      const m = randInt(rng, 3, 8);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `First multiple of ${m} after ${m}?`,
            correctAnswer: String(m * 2),
            explanation: `${m * 2}.`,
            difficulty: 1,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function compareFractions(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  const denomPool = [3, 4, 5, 6, 8, 10, 12];
  for (let i = 0; i < count; i++) {
    const d = denomPool[Math.floor(rng() * denomPool.length)];
    const n1 = randInt(rng, 1, d - 1);
    const otherNums = Array.from({ length: d - 1 }, (_, j) => j + 1).filter((n) => n !== n1);
    const n2 = otherNums[Math.floor(rng() * otherNums.length)];
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Greater: ${n1}/${d} or ${n2}/${d}?`,
          correctAnswer: n1 > n2 ? `${n1}/${d}` : `${n2}/${d}`,
          explanation: "Same denominator — compare tops.",
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function addFracLike(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const d = pickDenom(rng);
    const n1 = randInt(rng, 1, d - 1);
    const n2 = randInt(rng, 1, d - 1);
    const sum = n1 + n2;
    const g = gcd(sum, d);
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `${n1}/${d} + ${n2}/${d} = ? (lowest terms)`,
          correctAnswer: `${sum / g}/${d / g}`,
          explanation: `${sum}/${d} simplified.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function subFracLike(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const d = pickDenom(rng);
    const n1 = randInt(rng, 2, d - 1);
    const n2 = randInt(rng, 1, n1 - 1);
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `${n1}/${d} − ${n2}/${d} = ?`,
          correctAnswer: `${n1 - n2}/${d}`,
          explanation: `${n1 - n2}/${d}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function compareDecimals(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = (randInt(rng, 10, 999) / 100).toFixed(2);
    const b = (randInt(rng, 10, 999) / 100).toFixed(2);
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Greater: ${a} or ${b}?`,
          correctAnswer: parseFloat(a) > parseFloat(b) ? a : b,
          explanation: "Compare place values.",
          difficulty: 2,
          requiresScratchpad: false,
        },
        grade,
      ),
    );
  }
  return problems;
}

function areaRectangles(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const l = randInt(rng, 3, 20);
    const w = randInt(rng, 2, 15);
    return p(
      {
        type: "NUMERIC",
        prompt: `Area: ${l} cm × ${w} cm = ? sq cm`,
        correctAnswer: String(l * w),
        explanation: `${l * w}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function gcfLcm(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, 6, 36);
    const b = randInt(rng, 6, 36);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: i % 2 === 0 ? `GCF of ${a} and ${b}?` : `LCM of ${a} and ${b}?`,
          correctAnswer: String(i % 2 === 0 ? gcd(a, b) : (a * b) / gcd(a, b)),
          explanation: i % 2 === 0 ? "Greatest common factor." : "Least common multiple.",
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function integerAddSub(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, -25, 25);
    const b = randInt(rng, -25, 25);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: i % 2 === 0 ? `${a} + (${b}) = ?` : `${a} − (${b}) = ?`,
          correctAnswer: String(i % 2 === 0 ? a + b : a - b),
          explanation: "Watch the signs.",
          difficulty: 2,
          mistakeCategoriesJson: ["sign_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function integerMulDiv(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, -12, 12);
    const b = randInt(rng, -12, 12);
    if (b === 0) continue;
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} × ${b} = ?`,
            correctAnswer: String(a * b),
            explanation: `${a * b}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const prod = a * b;
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${prod} ÷ ${b} = ?`,
            correctAnswer: String(a),
            explanation: `${a}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  while (problems.length < count) {
    problems.push(...integerMulDiv(grade, count - problems.length, seed + 77));
  }
  return problems.slice(0, count);
}

function percentChange(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const base = randInt(rng, 40, 200);
    const pct = pickPct(rng);
    const add = (base * pct) / 100;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `Increase ${base} by ${pct}%. New value?`,
          correctAnswer: String(base + add),
          explanation: `${base + add}.`,
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function scaleDrawings(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const scale = randInt(rng, 2, 5);
    const model = randInt(rng, 3, 12);
    return p(
      {
        type: "NUMERIC",
        prompt: `Scale 1:${scale}, model ${model} cm. Real length?`,
        correctAnswer: String(model * scale),
        explanation: `×${scale}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function squareRoots(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const n = randInt(rng, 2, 15);
    const sq = n * n;
    return p(
      {
        type: "NUMERIC",
        prompt: `√${sq} = ?`,
        correctAnswer: String(n),
        explanation: `${n}²=${sq}.`,
        difficulty: 2,
        requiresScratchpad: false,
      },
      grade,
    );
  });
}

function linearPatterns(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const m = randInt(rng, 2, 6);
    const b = randInt(rng, 0, 10);
    const x = randInt(rng, 1, 10);
    return p(
      {
        type: "NUMERIC",
        prompt: `y = ${m}x + ${b}, x = ${x}. y = ?`,
        correctAnswer: String(m * x + b),
        explanation: `${m * x + b}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function measurementConversions(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) {
      const ft = randInt(rng, 2, 12);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${ft} feet = ? inches`,
            correctAnswer: String(ft * 12),
            explanation: "1 foot = 12 inches.",
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else if (i % 3 === 1) {
      const lb = randInt(rng, 2, 10);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${lb} pounds = ? ounces`,
            correctAnswer: String(lb * 16),
            explanation: "1 pound = 16 ounces.",
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else {
      const km = randInt(rng, 2, 8);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${km} kilometers = ? meters`,
            correctAnswer: String(km * 1000),
            explanation: "1 km = 1,000 meters.",
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

export const MATH_EXTENDED_BUILDERS: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  ...MATH_FACT_BUILDERS,
  Rounding: rounding,
  "Multi-Digit Addition": multiDigitAddOnly,
  "Multi-Digit Subtraction": multiDigitSubOnly,
  Perimeter: perimeter,
  "Telling Time": tellingTime,
  "Data & Graphs": dataGraphs,
  "One-Step Word Problems": oneStepWord,
  "Two-Step Word Problems": twoStepWord,
  "Multi-Digit Multiplication 2×1": mul2x1,
  "Multi-Digit Multiplication 2×2": mul2x2,
  "Long Division 1-Digit Divisor": longDivNoRem,
  "Long Division with Remainders": longDivRem,
  "Factors & Multiples": factorsMultiples,
  "Compare Fractions": compareFractions,
  "Add Fractions Like Denominators": addFracLike,
  "Subtract Fractions Like Denominators": subFracLike,
  "Compare Decimals": compareDecimals,
  "Area of Rectangles": areaRectangles,
  "GCF & LCM": gcfLcm,
  "Integer Addition & Subtraction": integerAddSub,
  "Integer Multiplication & Division": integerMulDiv,
  "Percent Increase & Decrease": percentChange,
  "Scale Drawings": scaleDrawings,
  "Square Roots": squareRoots,
  "Linear Patterns": linearPatterns,
  "Measurement Conversions": measurementConversions,
};
