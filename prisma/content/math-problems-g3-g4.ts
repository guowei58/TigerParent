import type { ContentProblem } from "./types";
import { createRng, hashSkillKey, randInt, pick } from "./rng";

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

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

// ─── Grade 3 ───────────────────────────────────────────────────────────────

function g3MultiplicationFacts(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  const pairs: [number, number][] = [];
  for (let a = 0; a <= 12; a++) {
    for (let b = 0; b <= 12; b++) pairs.push([a, b]);
  }
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  for (let i = 0; i < Math.min(count, pairs.length); i++) {
    const [a, b] = pairs[i];
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `What is ${a} × ${b}?`,
          correctAnswer: String(a * b),
          explanation: `${a} × ${b} = ${a * b}.`,
          difficulty: a + b <= 10 ? 1 : a + b <= 16 ? 2 : 3,
          requiresScratchpad: true,
          mistakeCategoriesJson: ["fact_error"],
        },
        grade,
      ),
    );
  }
  while (problems.length < count) {
    const a = randInt(rng, 2, 12);
    const b = randInt(rng, 2, 12);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `What is ${a} × ${b}?`,
          correctAnswer: String(a * b),
          explanation: `${a} × ${b} = ${a * b}.`,
          difficulty: 2,
          requiresScratchpad: true,
          mistakeCategoriesJson: ["fact_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g3DivisionFacts(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 1);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const divisor = randInt(rng, 2, 12);
    const quotient = randInt(rng, 1, 12);
    const dividend = divisor * quotient;
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `What is ${dividend} ÷ ${divisor}?`,
          correctAnswer: String(quotient),
          explanation: `${dividend} ÷ ${divisor} = ${quotient} because ${divisor} × ${quotient} = ${dividend}.`,
          difficulty: divisor <= 5 ? 1 : 2,
          mistakeCategoriesJson: ["fact_error", "inverse_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g3PlaceValue(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 2);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const kind = i % 4;
    const n = randInt(rng, 1000, 9999);
    const digits = String(n).split("").map(Number);
    const pos = randInt(rng, 0, 3);
    const names = ["ones", "tens", "hundreds", "thousands"];
    const placeValue = digits[3 - pos] * 10 ** pos;
    if (kind === 0) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `In the number ${n.toLocaleString()}, what is the value of the ${names[pos]} digit?`,
            correctAnswer: String(placeValue),
            explanation: `The ${names[pos]} digit is ${digits[3 - pos]}, worth ${placeValue}.`,
            difficulty: 2,
            mistakeCategoriesJson: ["place_value_error"],
          },
          grade,
        ),
      );
    } else if (kind === 1) {
      const expanded = `${digits[0]}×1000 + ${digits[1]}×100 + ${digits[2]}×10 + ${digits[3]}`;
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Write ${n} in expanded form using addition (e.g. 3000+400+20+5).`,
            correctAnswer: `${digits[0] * 1000}+${digits[1] * 100}+${digits[2] * 10}+${digits[3]}`,
            acceptableAnswersJson: [
              expanded.replace(/×/g, "*"),
              `${digits[0] * 1000} + ${digits[1] * 100} + ${digits[2] * 10} + ${digits[3]}`,
            ],
            explanation: `${n} = ${digits[0] * 1000} + ${digits[1] * 100} + ${digits[2] * 10} + ${digits[3]}.`,
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else if (kind === 2) {
      const rounded = Math.round(n / 100) * 100;
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Round ${n} to the nearest hundred.`,
            correctAnswer: String(rounded),
            explanation: `Look at the tens digit to round ${n} to ${rounded}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const a = randInt(rng, 100, 999);
      const b = randInt(rng, 1, 9);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `How many times does ${b} go into ${a * b}?`,
            correctAnswer: String(a),
            explanation: `${b} × ${a} = ${a * b}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g3MultiDigitAddSub(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 3);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const a = randInt(rng, 100, 9999);
      const b = randInt(rng, 100, 9999);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} + ${b} = ?`,
            correctAnswer: String(a + b),
            explanation: `Add ones, then tens, regroup if needed: ${a} + ${b} = ${a + b}.`,
            difficulty: a + b > 10000 ? 3 : 2,
          },
          grade,
        ),
      );
    } else {
      const a = randInt(rng, 500, 9999);
      const b = randInt(rng, 100, a - 1);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} − ${b} = ?`,
            correctAnswer: String(a - b),
            explanation: `Subtract carefully, borrowing if needed: ${a} − ${b} = ${a - b}.`,
            difficulty: 2,
            mistakeCategoriesJson: ["regrouping_error"],
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g3BasicFractions(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 4);
  const problems: ContentProblem[] = [];
  const fracs = [
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 3],
    [3, 4],
    [2, 4],
    [1, 6],
    [5, 6],
  ];
  for (let i = 0; i < count; i++) {
    const kind = i % 3;
    const [num, den] = pick(rng, fracs);
    if (kind === 0) {
      problems.push(
        p(
          {
            type: "MULTIPLE_CHOICE",
            prompt: `Which fraction shows ${num} equal part(s) out of ${den}?`,
            choicesJson: [`${num}/${den}`, `${num}/${den + 1}`, `${num + 1}/${den}`, `${den}/${num}`],
            correctAnswer: `${num}/${den}`,
            explanation: `${num}/${den} means ${num} out of ${den} equal parts.`,
            difficulty: 1,
          },
          grade,
        ),
      );
    } else if (kind === 1) {
      const [n2, d2] = pick(rng, fracs);
      const left = num / den;
      const right = n2 / d2;
      problems.push(
        p(
          {
            type: "MULTIPLE_CHOICE",
            prompt: `Compare: ${num}/${den} ___ ${n2}/${d2}. Which symbol is correct?`,
            choicesJson: ["<", ">", "="],
            correctAnswer: left < right ? "<" : left > right ? ">" : "=",
            explanation: `${num}/${den} ${left < right ? "<" : left > right ? ">" : "="} ${n2}/${d2}.`,
            difficulty: 2,
            requiresScratchpad: true,
          },
          grade,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `A pizza is cut into ${den} equal slices. You eat ${num}. What fraction did you eat?`,
            correctAnswer: `${num}/${den}`,
            explanation: `You ate ${num} of ${den} equal parts: ${num}/${den}.`,
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

function g3WordProblems(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 5);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const kind = i % 3;
    if (kind === 0) {
      const a = randInt(rng, 12, 45);
      const b = randInt(rng, 8, 30);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Maya has ${a} stickers. She gets ${b} more. How many stickers does she have now?`,
            correctAnswer: String(a + b),
            explanation: `Addition: ${a} + ${b} = ${a + b}.`,
            difficulty: 1,
          },
          grade,
        ),
      );
    } else if (kind === 1) {
      const boxes = randInt(rng, 3, 8);
      const each = randInt(rng, 4, 9);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `There are ${boxes} bags with ${each} apples each. How many apples in all?`,
            correctAnswer: String(boxes * each),
            explanation: `Multiply: ${boxes} × ${each} = ${boxes * each}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const total = randInt(rng, 40, 80);
      const spent = randInt(rng, 10, total - 5);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `A class collected ${total} cans for charity. They gave away ${spent}. How many are left?`,
            correctAnswer: String(total - spent),
            explanation: `Subtraction: ${total} − ${spent} = ${total - spent}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

// ─── Grade 4 ───────────────────────────────────────────────────────────────

function g4MultiDigitMultiplication(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 10);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const twoDigit = randInt(rng, 12, 99);
    const oneDigit = randInt(rng, 3, 9);
    if (i % 3 === 2) {
      const a = randInt(rng, 100, 999);
      const b = randInt(rng, 11, 29);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${a} × ${b} = ?`,
            correctAnswer: String(a * b),
            explanation: `Multiply ${a} by ${b} using partial products or standard algorithm = ${a * b}.`,
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
            prompt: `${twoDigit} × ${oneDigit} = ?`,
            correctAnswer: String(twoDigit * oneDigit),
            explanation: `${twoDigit} × ${oneDigit} = ${twoDigit * oneDigit}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g4LongDivision(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 11);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const divisor = randInt(rng, 3, 12);
    const quotient = randInt(rng, 11, 99);
    const remainder = i % 4 === 0 ? randInt(rng, 1, divisor - 1) : 0;
    const dividend = divisor * quotient + remainder;
    problems.push(
      p(
        {
          type: remainder
            ? "SHORT_ANSWER"
            : "NUMERIC",
          prompt: remainder
            ? `${dividend} ÷ ${divisor} = ? Write as quotient R remainder (e.g. 23 R 2).`
            : `${dividend} ÷ ${divisor} = ?`,
          correctAnswer: remainder ? `${quotient} R ${remainder}` : String(quotient),
          acceptableAnswersJson: remainder
            ? [`${quotient}r${remainder}`, `${quotient} R${remainder}`]
            : undefined,
          explanation: remainder
            ? `${divisor} × ${quotient} = ${divisor * quotient}, remainder ${remainder}.`
            : `${dividend} ÷ ${divisor} = ${quotient}.`,
          difficulty: remainder ? 3 : 2,
          mistakeCategoriesJson: ["division_error", "remainder_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g4EquivalentFractions(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 12);
  const base = [
    [1, 2, 2, 4],
    [1, 3, 2, 6],
    [2, 3, 4, 6],
    [3, 4, 6, 8],
    [2, 5, 4, 10],
    [3, 5, 6, 10],
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [n1, d1, n2, d2] = base[i % base.length];
    const kind = i % 2;
    if (kind === 0) {
      const wrong = [`${n1}/${d1 + 1}`, `${n1 + 1}/${d2}`, `${d1}/${n2}`];
      const choices = [`${n2}/${d2}`, ...wrong].sort(() => rng() - 0.5);
      problems.push(
        p(
          {
            type: "MULTIPLE_CHOICE",
            prompt: `Which fraction is equivalent to ${n1}/${d1}?`,
            choicesJson: choices,
            correctAnswer: `${n2}/${d2}`,
            explanation: `Multiply numerator and denominator by the same number: ${n1}/${d1} = ${n2}/${d2}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const k = randInt(rng, 2, 5);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `${n1}/${d1} = ?/${d1 * k}. Find the missing numerator.`,
            correctAnswer: String(n1 * k),
            explanation: `Multiply top and bottom by ${k}: ${n1 * k}/${d1 * k}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g4AddSubtractFractions(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 13);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const denom = pick(rng, [4, 6, 8, 10, 12]);
    const n1 = randInt(rng, 1, denom - 2);
    const n2 = randInt(rng, 1, denom - 2);
    if (i % 2 === 0) {
      const sum = n1 + n2;
      if (sum >= denom) continue;
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `${n1}/${denom} + ${n2}/${denom} = ? (lowest terms, like 3/4)`,
            correctAnswer: `${sum}/${denom}`,
            explanation: `Same denominator: add numerators ${n1}+${n2}=${sum}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    } else {
      const big = Math.max(n1, n2);
      const small = Math.min(n1, n2);
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `${big}/${denom} − ${small}/${denom} = ?`,
            correctAnswer: `${big - small}/${denom}`,
            explanation: `Subtract numerators: ${big} − ${small} = ${big - small}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  while (problems.length < count) {
    problems.push(...g4AddSubtractFractions(grade, count - problems.length, seed + 999));
  }
  return problems.slice(0, count);
}

function g4DecimalPlaceValue(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 14);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const t = randInt(rng, 0, 9);
    const h = randInt(rng, 0, 9);
    const val = t + h / 10 + (i % 3 === 0 ? randInt(rng, 0, 9) / 100 : 0);
    const str = val.toFixed(i % 3 === 0 ? 2 : 1);
    const kind = i % 3;
    if (kind === 0) {
      problems.push(
        p(
          {
            type: "MULTIPLE_CHOICE",
            prompt: `In ${str}, which digit is in the tenths place?`,
            choicesJson: [String(t), String(h), String(Math.floor(val)), "."],
            correctAnswer: String(t),
            explanation: `The tenths place is the first digit after the decimal.`,
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else if (kind === 1) {
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Write ${t} ones and ${h} tenths as a decimal.`,
            correctAnswer: `${t}.${h}`,
            explanation: `${t}.${h} shows ${t} ones and ${h} tenths.`,
            difficulty: 2,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else {
      const expanded = `${Math.floor(val)} + ${t / 10}${h && i % 3 === 0 ? ` + ${h / 100}` : ""}`;
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `What is ${str} × 10?`,
            correctAnswer: String(parseFloat(str) * 10),
            explanation: `Multiplying by 10 shifts digits left: ${parseFloat(str) * 10}.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g4Geometry(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 15);
  const problems: ContentProblem[] = [];
  const angleFacts = [
    { q: "How many degrees in a right angle?", a: "90" },
    { q: "How many degrees on a straight line?", a: "180" },
    { q: "How many degrees in a full turn?", a: "360" },
    { q: "A triangle's angles sum to how many degrees?", a: "180" },
  ];
  for (let i = 0; i < count; i++) {
    if (i < angleFacts.length) {
      const f = angleFacts[i % angleFacts.length];
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: f.q,
            correctAnswer: f.a,
            explanation: `Geometry fact: ${f.a}°.`,
            difficulty: 1,
            requiresScratchpad: false,
          },
          grade,
        ),
      );
    } else if (i % 3 === 0) {
      const base = randInt(rng, 4, 12);
      const height = randInt(rng, 3, 10);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Triangle area: base ${base} cm, height ${height} cm. Area = ½ × base × height = ? sq cm`,
            correctAnswer: String(0.5 * base * height),
            explanation: `Area = ½ × ${base} × ${height} = ${0.5 * base * height}.`,
            difficulty: 3,
          },
          grade,
        ),
      );
    } else {
      const length = randInt(rng, 5, 15);
      const width = randInt(rng, 3, 10);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Rectangle: length ${length} cm, width ${width} cm. Perimeter = ? cm`,
            correctAnswer: String(2 * (length + width)),
            explanation: `P = 2(${length}+${width}) = ${2 * (length + width)}.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function g4MultiStepWordProblems(grade: number, count: number, seed: number) {
  const rng = createRng(seed + 16);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const books = randInt(rng, 4, 8);
    const each = randInt(rng, 6, 12);
    const shelves = randInt(rng, 2, 4);
    const total = books * each;
    const perShelf = Math.ceil(total / shelves);
    problems.push(
      p(
        {
          type: "NUMERIC",
          prompt: `A library has ${books} boxes with ${each} books each. They place them equally on ${shelves} shelves. What is the minimum books on any shelf if split as evenly as possible? (whole books only)`,
          correctAnswer: String(Math.floor(total / shelves)),
          explanation: `Total ${total} books; ${total} ÷ ${shelves} = ${Math.floor(total / shelves)} each (floor for equal whole split).`,
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

// Continue with grade 5-7 in part 2 file - actually I'll append to same file via second write or continue

export const MATH_BUILDERS: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Multiplication Facts": g3MultiplicationFacts,
  "Division Facts": g3DivisionFacts,
  "Place Value": g3PlaceValue,
  "Multi-Digit Addition & Subtraction": g3MultiDigitAddSub,
  "Basic Fractions": g3BasicFractions,
  "Word Problems": g3WordProblems,
  "Multi-Digit Multiplication": g4MultiDigitMultiplication,
  "Long Division": g4LongDivision,
  "Equivalent Fractions": g4EquivalentFractions,
  "Add & Subtract Fractions": g4AddSubtractFractions,
  "Decimal Place Value": g4DecimalPlaceValue,
  "Geometry Basics": g4Geometry,
  "Multi-Step Word Problems": g4MultiStepWordProblems,
};
