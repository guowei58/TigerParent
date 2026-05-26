import type { ContentProblem } from "./types";
import { createRng, randInt } from "./rng";

const MATH_SOURCE =
  "CCSS-aligned; original items for grades 8–12 (algebra, geometry, pre-calculus formats)";

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

function linearEquations(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const x = randInt(rng, 1, 12);
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 1, 15);
    const c = a * x + b;
    return p(
      {
        type: "NUMERIC",
        prompt: `Solve: ${a}x + ${b} = ${c}`,
        correctAnswer: String(x),
        explanation: `${a}x = ${c - b}, x = ${x}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function systemsOfEquations(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const x = randInt(rng, 1, 8);
    const y = randInt(rng, 1, 8);
    const a1 = randInt(rng, 1, 4);
    const b1 = randInt(rng, 1, 4);
    const c1 = a1 * x + b1 * y;
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `If ${a1}x + ${b1}y = ${c1} and x = ${x}, find y.`,
        correctAnswer: String(y),
        explanation: `Substitute x = ${x}: ${b1}y = ${c1 - a1 * x}, y = ${y}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function functionsGraphs(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const m = randInt(rng, 1, 5);
    const b = randInt(rng, -5, 5);
    const x = randInt(rng, 0, 6);
    return p(
      {
        type: "NUMERIC",
        prompt: `f(x) = ${m}x + ${b}. Find f(${x}).`,
        correctAnswer: String(m * x + b),
        explanation: `f(${x}) = ${m}(${x}) + ${b} = ${m * x + b}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function scientificNotation(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const exp = randInt(rng, 2, 6);
    const coeff = randInt(rng, 1, 9);
    const n = coeff * 10 ** exp;
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Write ${n} in scientific notation (e.g. 3.2×10^4).`,
        correctAnswer: `${coeff}×10^${exp}`,
        acceptableAnswersJson: [`${coeff}×10^${exp}`, `${coeff}e${exp}`, `${coeff} * 10^${exp}`],
        explanation: `${n} = ${coeff} × 10^${exp}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function exponentsRoots(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => {
    if (i % 2 === 0) {
      const base = randInt(rng, 2, 6);
      const exp = randInt(rng, 2, 4);
      return p(
        {
          type: "NUMERIC",
          prompt: `${base}^${exp} = ?`,
          correctAnswer: String(base ** exp),
          explanation: `${base}^${exp} = ${base ** exp}.`,
          difficulty: 2,
        },
        grade,
      );
    }
    const n = randInt(rng, 2, 12) ** 2;
    return p(
      {
        type: "NUMERIC",
        prompt: `√${n} = ?`,
        correctAnswer: String(Math.sqrt(n)),
        explanation: `√${n} = ${Math.sqrt(n)}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function pythagoreanTheorem(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]];
  return Array.from({ length: count }, (_, i) => {
    const [a, b, c] = triples[i % triples.length];
    if (i % 2 === 0) {
      return p(
        {
          type: "NUMERIC",
          prompt: `Right triangle legs ${a} and ${b}. Hypotenuse = ?`,
          correctAnswer: String(c),
          explanation: `${a}² + ${b}² = ${c}², so c = ${c}.`,
          difficulty: 2,
        },
        grade,
      );
    }
    return p(
      {
        type: "NUMERIC",
        prompt: `Right triangle hypotenuse ${c}, one leg ${a}. Other leg = ?`,
        correctAnswer: String(b),
        explanation: `${c}² − ${a}² = ${b}², leg = ${b}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function transformations(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const x = randInt(rng, -5, 5);
    const y = randInt(rng, -5, 5);
    const dx = randInt(rng, 1, 4);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Point (${x}, ${y}) translated right ${dx} units. New coordinates? (x, y)`,
        correctAnswer: `(${x + dx}, ${y})`,
        explanation: `Add ${dx} to x: (${x + dx}, ${y}).`,
        difficulty: 2,
        requiresScratchpad: false,
      },
      grade,
    );
  });
}

function scatterPlots(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const m = randInt(rng, 1, 4);
    const x = randInt(rng, 1, 8);
    return p(
      {
        type: "NUMERIC",
        prompt: `Line of best fit: y = ${m}x + 2. Predict y when x = ${x}.`,
        correctAnswer: String(m * x + 2),
        explanation: `y = ${m}(${x}) + 2 = ${m * x + 2}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function irrationalNumbers(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const items = [
    { q: "Which is irrational?", choices: ["√2", "0.5", "3/4", "7"], a: "√2" },
    { q: "√9 equals:", choices: ["3", "4.5", "√3", "1.5"], a: "3" },
    { q: "Between which integers is √20?", choices: ["4 and 5", "2 and 3", "5 and 6", "3 and 4"], a: "4 and 5" },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return p(
      {
        type: "MULTIPLE_CHOICE",
        prompt: item.q,
        choicesJson: item.choices,
        correctAnswer: item.a,
        explanation: `${item.a} is correct.`,
        difficulty: 2,
        requiresScratchpad: false,
      },
      grade,
    );
  });
}

function linearFunctions(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const m = randInt(rng, -4, 4) || 2;
    const b = randInt(rng, -3, 6);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Line slope ${m}, y-intercept ${b}. Write y = mx + b.`,
        correctAnswer: `y = ${m}x + ${b}`,
        acceptableAnswersJson: [`y=${m}x+${b}`, `y = ${m}x+${b}`],
        explanation: `Slope-intercept form: y = ${m}x + ${b}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function quadraticEquations(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const r1 = randInt(rng, 1, 6);
    const r2 = randInt(rng, 1, 6);
    const b = -(r1 + r2);
    const c = r1 * r2;
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Solve: x² ${b >= 0 ? "+" : ""}${b}x + ${c} = 0 (smaller root)`,
        correctAnswer: String(Math.min(r1, r2)),
        explanation: `Factors (x−${r1})(x−${r2}) = 0, roots ${r1} and ${r2}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function polynomialOperations(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 1, 5);
    const b = randInt(rng, 1, 5);
    const c = randInt(rng, 1, 5);
    const d = randInt(rng, 1, 5);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `(${a}x + ${b}) + (${c}x + ${d}) = ? (like terms)`,
        correctAnswer: `${a + c}x + ${b + d}`,
        explanation: `Combine x terms and constants: ${a + c}x + ${b + d}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function factoring(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 2, 6);
    const b = randInt(rng, 2, 6);
    const product = a * b;
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Factor: ${product}x + ${a * b * 2} (factor out GCF)`,
        correctAnswer: `${a}x(${b} + 2)`,
        explanation: `GCF is ${a}x: ${a}x(${b} + 2).`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function radicalsExponents(grade: number, count: number, seed: number) {
  return exponentsRoots(grade, count, seed + 1);
}

function statisticsRegression(grade: number, count: number, seed: number) {
  return scatterPlots(grade, count, seed + 2);
}

function exponentialGrowth(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const start = randInt(rng, 50, 200);
    const rate = 2;
    const years = randInt(rng, 2, 4);
    const result = start * rate ** years;
    return p(
      {
        type: "NUMERIC",
        prompt: `$${start} doubles each year. Value after ${years} years?`,
        correctAnswer: String(result),
        explanation: `${start} × 2^${years} = ${result}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function geometricProofs(grade: number, count: number, seed: number) {
  const items = [
    { q: "Vertical angles are:", a: "congruent", w: ["supplementary", "complementary", "unequal"] },
    { q: "If two lines are parallel, alternate interior angles are:", a: "congruent", w: ["supplementary", "90°", "random"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return p(
      {
        type: "MULTIPLE_CHOICE",
        prompt: item.q,
        choicesJson: [item.a, ...item.w],
        correctAnswer: item.a,
        explanation: `${item.a} by geometry theorems.`,
        difficulty: 3,
        requiresScratchpad: false,
      },
      grade,
    );
  });
}

function similarityCongruence(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const scale = randInt(rng, 2, 4);
    const side = randInt(rng, 3, 8);
    return p(
      {
        type: "NUMERIC",
        prompt: `Similar triangles scale factor ${scale}. Small side ${side}. Large corresponding side = ?`,
        correctAnswer: String(side * scale),
        explanation: `${side} × ${scale} = ${side * scale}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function rightTriangleTrig(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17]];
  return Array.from({ length: count }, (_, i) => {
    const [opp, adj, hyp] = triples[i % triples.length];
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Right triangle: opposite ${opp}, hypotenuse ${hyp}. sin(θ) = ? (fraction)`,
        correctAnswer: `${opp}/${hyp}`,
        explanation: `sin = opposite/hypotenuse = ${opp}/${hyp}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function circleTheorems(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const r = randInt(rng, 3, 12);
    const angle = randInt(rng, 30, 120);
    return p(
      {
        type: "NUMERIC",
        prompt: `Inscribed angle ${angle}° intercepts arc of ?°`,
        correctAnswer: String(angle * 2),
        explanation: `Inscribed angle = ½ intercepted arc: ${angle * 2}°.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function areaVolume3D(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const l = randInt(rng, 3, 8);
    const w = randInt(rng, 2, 6);
    const h = randInt(rng, 2, 6);
    return p(
      {
        type: "NUMERIC",
        prompt: `Rectangular prism ${l}×${w}×${h}. Volume = ?`,
        correctAnswer: String(l * w * h),
        explanation: `V = lwh = ${l * w * h}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function coordinateGeometry(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const x1 = randInt(rng, -5, 5);
    const y1 = randInt(rng, -5, 5);
    const x2 = randInt(rng, -5, 5);
    const y2 = randInt(rng, -5, 5);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Midpoint of (${x1}, ${y1}) and (${x2}, ${y2})? (x, y)`,
        correctAnswer: `(${midX}, ${midY})`,
        explanation: `Midpoint = ((${x1}+${x2})/2, (${y1}+${y2})/2).`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function conditionalProbability(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, () =>
    p(
      {
        type: "SHORT_ANSWER",
        prompt: `Bag: 3 red, 2 blue. P(red then red without replacement)? (fraction)`,
        correctAnswer: "3/10",
        explanation: `(3/5)(2/4) = 6/20 = 3/10.`,
        difficulty: 3,
      },
      grade,
    ),
  );
}

function logarithms(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const bases = [2, 3, 10];
  return Array.from({ length: count }, (_, i) => {
    const base = bases[i % bases.length];
    const exp = randInt(rng, 1, 4);
    const n = base ** exp;
    return p(
      {
        type: "NUMERIC",
        prompt: `log_${base}(${n}) = ?`,
        correctAnswer: String(exp),
        explanation: `${base}^${exp} = ${n}, so log = ${exp}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function exponentialFunctions(grade: number, count: number, seed: number) {
  return exponentialGrowth(grade, count, seed + 3);
}

function sequencesSeries(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => {
    if (i % 2 === 0) {
      const a1 = randInt(rng, 2, 8);
      const d = randInt(rng, 2, 5);
      const n = 5;
      const an = a1 + (n - 1) * d;
      return p(
        {
          type: "NUMERIC",
          prompt: `Arithmetic sequence: first term ${a1}, common difference ${d}. 5th term = ?`,
          correctAnswer: String(an),
          explanation: `a₅ = ${a1} + 4(${d}) = ${an}.`,
          difficulty: 2,
        },
        grade,
      );
    }
    const a1 = randInt(rng, 2, 4);
    const r = 2;
    const n = 4;
    return p(
      {
        type: "NUMERIC",
        prompt: `Geometric sequence: first term ${a1}, ratio ${r}. 4th term = ?`,
        correctAnswer: String(a1 * r ** (n - 1)),
        explanation: `${a1} × 2³ = ${a1 * 8}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function rationalExpressions(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 2, 6);
    const b = randInt(rng, 2, 6);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Simplify: ${a * b}x / ${a} (coefficient only)`,
        correctAnswer: `${b}x`,
        explanation: `Divide coefficients: ${b}x.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function complexNumbers(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 1, 5);
    const b = randInt(rng, 1, 5);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `(${a} + ${b}i) + (${a} − ${b}i) = ? (a + bi form)`,
        correctAnswer: `${2 * a}`,
        explanation: `Imaginary parts cancel: ${2 * a} + 0i.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function probabilityCombinatorics(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    p(
      {
        type: "NUMERIC",
        prompt: i % 2 === 0 ? `How many ways to arrange ABC?` : `Choose 2 from 5 items: C(5,2) = ?`,
        correctAnswer: i % 2 === 0 ? "6" : "10",
        explanation: i % 2 === 0 ? "3! = 6 permutations." : "C(5,2) = 10.",
        difficulty: 3,
      },
      grade,
    ),
  );
}

function trigonometricFunctions(grade: number, count: number, seed: number) {
  const angles = [0, 30, 45, 60, 90];
  const sins: Record<number, string> = { 0: "0", 30: "1/2", 45: "√2/2", 60: "√3/2", 90: "1" };
  return Array.from({ length: count }, (_, i) => {
    const angle = angles[i % angles.length];
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `sin(${angle}°) = ? (exact value)`,
        correctAnswer: sins[angle],
        explanation: `sin(${angle}°) = ${sins[angle]}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function conicSections(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const h = randInt(rng, -3, 3);
    const k = randInt(rng, -3, 3);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `Parabola vertex at (${h}, ${k}). Which form shows vertex?`,
        correctAnswer: `y = a(x − ${h})² + ${k}`,
        explanation: `Vertex form: y = a(x − h)² + k.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function limitsContinuity(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 1, 5);
    return p(
      {
        type: "NUMERIC",
        prompt: `lim(x→${a}) (2x + 3) = ?`,
        correctAnswer: String(2 * a + 3),
        explanation: `Substitute x = ${a}: ${2 * a + 3}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function derivatives(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const n = randInt(rng, 2, 5);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `d/dx (x^${n}) = ?`,
        correctAnswer: `${n}x^${n - 1}`,
        explanation: `Power rule: ${n}x^${n - 1}.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function integralsIntroduction(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const n = randInt(rng, 2, 4);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `∫ ${n}x dx = ? (+ C)`,
        correctAnswer: `${n / 2}x^2 + C`,
        explanation: `Reverse power rule: ${n / 2}x² + C.`,
        difficulty: 3,
      },
      grade,
    );
  });
}

function trigIdentities(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, () =>
    p(
      {
        type: "SHORT_ANSWER",
        prompt: `sin²θ + cos²θ = ?`,
        correctAnswer: "1",
        explanation: "Pythagorean identity: sin²θ + cos²θ = 1.",
        difficulty: 3,
      },
      grade,
    ),
  );
}

function vectorsMatrices(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 1, 5);
    const b = randInt(rng, 1, 5);
    const c = randInt(rng, 1, 5);
    const d = randInt(rng, 1, 5);
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `[${a}, ${b}] + [${c}, ${d}] = ?`,
        correctAnswer: `[${a + c}, ${b + d}]`,
        explanation: `Add components: [${a + c}, ${b + d}].`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function satMathReview(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const builders = [linearEquations, pythagoreanTheorem, quadraticEquations, percentWord];
  return Array.from({ length: count }, (_, i) => builders[i % builders.length](grade, 1, seed + i)[0]);
}

function percentWord(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const n = randInt(rng, 20, 200);
    const pct = randInt(rng, 10, 50);
    return p(
      {
        type: "NUMERIC",
        prompt: `${pct}% of ${n} = ?`,
        correctAnswer: String((n * pct) / 100),
        explanation: `${pct}% × ${n} = ${(n * pct) / 100}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

export const MATH_BUILDERS_G8_G12: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Linear Equations": linearEquations,
  "Systems of Equations": systemsOfEquations,
  "Functions & Graphs": functionsGraphs,
  "Scientific Notation": scientificNotation,
  "Exponents & Roots": exponentsRoots,
  "Pythagorean Theorem": pythagoreanTheorem,
  Transformations: transformations,
  "Scatter Plots": scatterPlots,
  "Irrational Numbers": irrationalNumbers,
  "Linear Functions": linearFunctions,
  "Quadratic Equations": quadraticEquations,
  "Polynomial Operations": polynomialOperations,
  Factoring: factoring,
  "Radicals & Exponents": radicalsExponents,
  Inequalities: linearEquations,
  "Statistics & Regression": statisticsRegression,
  "Exponential Growth": exponentialGrowth,
  "Geometric Proofs": geometricProofs,
  "Similarity & Congruence": similarityCongruence,
  "Right Triangle Trigonometry": rightTriangleTrig,
  "Circle Theorems": circleTheorems,
  "Area & Volume 3D": areaVolume3D,
  "Coordinate Geometry": coordinateGeometry,
  "Conditional Probability": conditionalProbability,
  Logarithms: logarithms,
  "Exponential Functions": exponentialFunctions,
  "Sequences & Series": sequencesSeries,
  "Rational Expressions": rationalExpressions,
  "Complex Numbers": complexNumbers,
  "Probability & Combinatorics": probabilityCombinatorics,
  "Trigonometric Functions": trigonometricFunctions,
  "Conic Sections": conicSections,
  "Limits & Continuity": limitsContinuity,
  Derivatives: derivatives,
  "Integrals Introduction": integralsIntroduction,
  "Trigonometric Identities": trigIdentities,
  "Vectors & Matrices": vectorsMatrices,
  "SAT Math Review": satMathReview,
};
