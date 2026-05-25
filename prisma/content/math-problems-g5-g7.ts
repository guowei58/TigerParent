import type { ContentProblem } from "./types";
import { createRng, randInt, pick } from "./rng";

const MATH_SOURCE =
  "CCSS-aligned; formats inspired by EngageNY/Eureka Math & Illustrative Mathematics (original items)";

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
    mistakeCategoriesJson: partial.mistakeCategoriesJson ?? ["calculation_error"],
  };
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function g5FractionOperations(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 20);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const n1 = randInt(rng, 1, 4);
      const d1 = randInt(rng, 2, 6);
      const n2 = randInt(rng, 1, 4);
      const d2 = randInt(rng, 2, 6);
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `${n1}/${d1} × ${n2}/${d2} = ? (lowest terms)`,
            correctAnswer: `${(n1 * n2) / gcd(n1 * n2, d1 * d2)}/${(d1 * d2) / gcd(n1 * n2, d1 * d2)}`,
            explanation: `Multiply across: (${n1}×${n2})/(${d1}×${d2}), then simplify.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    } else {
      const n1 = randInt(rng, 2, 8);
      const d1 = randInt(rng, 2, 4);
      const n2 = randInt(rng, 1, 3);
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `${n1}/${d1} ÷ ${n2}/1 = ? (as fraction in lowest terms)`,
            correctAnswer: `${n1}/${d1 * n2}`,
            explanation: `Divide by whole number ${n2}: multiply denominator.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g5DecimalOperations(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 21);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = (randInt(rng, 10, 999) / 100).toFixed(2);
    const b = (randInt(rng, 10, 999) / 100).toFixed(2);
    const op = i % 3;
    if (op === 0) {
      const sum = (parseFloat(a) + parseFloat(b)).toFixed(2);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} + ${b} = ?`,
            correctAnswer: sum,
            explanation: `Line up decimal points: ${sum}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else if (op === 1) {
      const big = Math.max(parseFloat(a), parseFloat(b));
      const small = Math.min(parseFloat(a), parseFloat(b));
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${big.toFixed(2)} − ${small.toFixed(2)} = ?`,
            correctAnswer: (big - small).toFixed(2),
            explanation: `Subtract decimals carefully.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const m = randInt(rng, 2, 9);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} × ${m} = ?`,
            correctAnswer: (parseFloat(a) * m).toFixed(2),
            explanation: `Multiply as whole numbers, then place decimal.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g5Volume(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 22);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const l = randInt(rng, 3, 12);
    const w = randInt(rng, 2, 8);
    const h = randInt(rng, 2, 10);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `Rectangular prism: length ${l} cm, width ${w} cm, height ${h} cm. Volume = ? cubic cm`,
          correctAnswer: String(l * w * h),
          explanation: `V = l×w×h = ${l}×${w}×${h} = ${l * w * h}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g5CoordinatePlane(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 23);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, -5, 10);
    const y = randInt(rng, -5, 10);
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Plot point (${x}, ${y}). What is the x-coordinate?`,
            correctAnswer: String(x),
            explanation: `Ordered pair (x, y): x comes first.`,
            difficulty: 1,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else {
      const dx = randInt(rng, 1, 5);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Start at (${x}, ${y}). Move right ${dx} units. New x-coordinate?`,
            correctAnswer: String(x + dx),
            explanation: `Right increases x: ${x} + ${dx} = ${x + dx}.`,
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

function g5OrderOfOperations(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 24);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 2, 9);
    const c = randInt(rng, 1, 5);
    const val = a + b * c;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} + ${b} × ${c} = ? (use order of operations)`,
          correctAnswer: String(val),
          explanation: `Multiply first: ${b}×${c}=${b * c}, then ${a}+${b * c}=${val}.`,
          difficulty: 2,
          mistakeCategoriesJson: ["order_of_operations"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g5PercentIntro(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 25);
  const problems: ContentProblem[] = [];
  const pcts = [10, 20, 25, 50, 75];
  for (let i = 0; i < count; i++) {
    const pct = pick(rng, pcts);
    const base = randInt(rng, 20, 200);
    const ans = (base * pct) / 100;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `What is ${pct}% of ${base}?`,
          correctAnswer: String(ans),
          explanation: `${pct}% of ${base} = ${pct}/100 × ${base} = ${ans}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g6Ratios(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 30);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, 2, 12);
    const b = randInt(rng, 2, 12);
    const g = gcd(a, b);
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Write the ratio of ${a} to ${b} in simplest form (a:b).`,
          correctAnswer: `${a / g}:${b / g}`,
          acceptableAnswersJson: [`${a / g} : ${b / g}`],
          explanation: `Divide both by GCF ${g}: ${a / g}:${b / g}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g6Rates(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 31);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const miles = randInt(rng, 60, 240);
    const hours = pick(rng, [2, 3, 4, 5, 6]);
    if (miles % hours !== 0) continue;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `A car travels ${miles} miles in ${hours} hours. Unit rate in miles per hour?`,
          correctAnswer: String(miles / hours),
          explanation: `${miles} ÷ ${hours} = ${miles / hours} mph.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  while (problems.length < count) {
    problems.push(...g6Rates(grade, count - problems.length, seed + 500));
  }
  return problems.slice(0, count);
}

function g6Percentages(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 32);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const pct = pick(rng, [15, 20, 30, 40, 60, 80]);
    const base = randInt(rng, 50, 300);
    if ((base * pct) % 100 !== 0 && i % 2 === 0) continue;
    const ans = (base * pct) / 100;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${pct}% of ${base} = ?`,
          correctAnswer: String(ans),
          explanation: `${pct}/100 × ${base} = ${ans}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  while (problems.length < count) {
    problems.push(...g6Percentages(grade, count - problems.length, seed + 600));
  }
  return problems.slice(0, count);
}

function g6Integers(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 33);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, -20, 20);
    const b = randInt(rng, -20, 20);
    const op = i % 2;
    if (op === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} + (${b}) = ?`,
            correctAnswer: String(a + b),
            explanation: `${a} + ${b} = ${a + b}.`,
            difficulty: 2,
            mistakeCategoriesJson: ["integer_sign_error"],
          },
          grade,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} − (${b}) = ?`,
            correctAnswer: String(a - b),
            explanation: `Subtracting ${b}: ${a} − ${b} = ${a - b}.`,
            difficulty: 3,
            mistakeCategoriesJson: ["integer_sign_error"],
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g6Expressions(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 34);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 2, 9);
    const a = randInt(rng, 2, 7);
    const b = randInt(rng, 1, 12);
    const val = a * x + b;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `Evaluate ${a}x + ${b} when x = ${x}.`,
          correctAnswer: String(val),
          explanation: `${a}(${x}) + ${b} = ${a * x} + ${b} = ${val}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g6OneStepEquations(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 35);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const x = randInt(rng, 1, 15);
      const a = randInt(rng, 2, 9);
      const b = a * x;
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Solve: ${a}x = ${b}`,
            correctAnswer: String(x),
            explanation: `Divide both sides by ${a}: x = ${x}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const x = randInt(rng, 1, 20);
      const a = randInt(rng, 5, 30);
      const b = a - x;
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Solve: x + ${b} = ${a}`,
            correctAnswer: String(x),
            explanation: `Subtract ${b}: x = ${x}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g6Statistics(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 36);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const set = Array.from({ length: 5 }, () => randInt(rng, 1, 20)).sort(
      (a, b) => a - b,
    );
    const mean = set.reduce((s, n) => s + n, 0) / set.length;
    const median = set[2];
    const kind = i % 3;
    if (kind === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Data set: ${set.join(", ")}. What is the mean?`,
            correctAnswer: String(mean),
            explanation: `Sum ${set.reduce((s, n) => s + n, 0)} ÷ 5 = ${mean}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else if (kind === 1) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Data set: ${set.join(", ")}. What is the median?`,
            correctAnswer: String(median),
            explanation: `Middle value when ordered: ${median}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const range = set[4] - set[0];
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Data set: ${set.join(", ")}. What is the range?`,
            correctAnswer: String(range),
            explanation: `Max − min = ${set[4]} − ${set[0]} = ${range}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g7Proportional(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 40);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const k = randInt(rng, 2, 6);
    const x = randInt(rng, 3, 10);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `y varies with x: y = ${k}x. When x = ${x}, what is y?`,
          correctAnswer: String(k * x),
          explanation: `y = ${k}(${x}) = ${k * x}.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g7NegativeNumbers(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 41);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = randInt(rng, -15, 15);
    const b = randInt(rng, -15, 15);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `${a} × ${b} = ?`,
          correctAnswer: String(a * b),
          explanation: `Sign rules: ${a} × ${b} = ${a * b}.`,
          difficulty: 3,
          mistakeCategoriesJson: ["sign_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g7MultiStepEquations(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 42);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 2, 9);
    const a = randInt(rng, 2, 5);
    const b = randInt(rng, 1, 10);
    const c = a * x + b;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `Solve: ${a}x + ${b} = ${c}`,
          correctAnswer: String(x),
          explanation: `Subtract ${b}, divide by ${a}: x = ${x}.`,
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g7Inequalities(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 43);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 1, 8);
    const a = randInt(rng, 2, 6);
    const rhs = a * x + randInt(rng, 1, 5);
    problems.push(
      p(
        {
          type: "MULTIPLE_CHOICE",
          prompt: `Which value satisfies ${a}x < ${rhs}?`,
          choicesJson: [String(x), String(x + 3), String(x + 5), String(rhs)],
          correctAnswer: String(x),
          explanation: `${a}(${x}) = ${a * x} which is less than ${rhs}.`,
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g7Probability(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 44);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const red = randInt(rng, 2, 6);
    const blue = randInt(rng, 2, 6);
    const total = red + blue;
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Bag: ${red} red, ${blue} blue marbles. P(red) = ? (fraction in lowest terms)`,
          correctAnswer: `${red / gcd(red, total)}/${total / gcd(red, total)}`,
          explanation: `P(red) = ${red}/${total}, simplified.`,
          difficulty: 2,
        },
        grade,
      ),
    );
  }
  return problems;
}

function g7Geometry(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 45);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const r = randInt(rng, 3, 12);
      const circ = (2 * Math.PI * r).toFixed(1);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Circle radius ${r} cm. Circumference ≈ ? cm (use 3.14 for π, round tenths)`,
            correctAnswer: (2 * 3.14 * r).toFixed(1),
            explanation: `C = 2πr ≈ 2(3.14)(${r}) = ${circ}.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    } else {
      const b = randInt(rng, 4, 14);
      const h = randInt(rng, 3, 10);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Triangle: base ${b} cm, height ${h} cm. Area = ? sq cm`,
            correctAnswer: String(0.5 * b * h),
            explanation: `A = ½bh = ${0.5 * b * h}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g7PreAlgebraFluency(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 46);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const builders = [
      () => g7MultiStepEquations(grade, 1, seed + i)[0],
      () => g7NegativeNumbers(grade, 1, seed + i)[0],
      () => g7Proportional(grade, 1, seed + i)[0],
    ];
    problems.push(builders[i % builders.length]());
  }
  return problems;
}

export const MATH_BUILDERS_G5_G7: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Fraction Operations": g5FractionOperations,
  "Decimal Operations": g5DecimalOperations,
  Volume: g5Volume,
  "Coordinate Plane": g5CoordinatePlane,
  "Order of Operations": g5OrderOfOperations,
  "Percent Introduction": g5PercentIntro,
  Ratios: g6Ratios,
  Rates: g6Rates,
  Percentages: g6Percentages,
  Integers: g6Integers,
  Expressions: g6Expressions,
  "One-Step Equations": g6OneStepEquations,
  "Statistics Basics": g6Statistics,
  "Proportional Relationships": g7Proportional,
  "Negative Numbers": g7NegativeNumbers,
  "Multi-Step Equations": g7MultiStepEquations,
  Inequalities: g7Inequalities,
  Probability: g7Probability,
  Geometry: g7Geometry,
  "Pre-Algebra Fluency": g7PreAlgebraFluency,
};
