import type { ContentProblem } from "./types";
import { createRng, randInt } from "./rng";

const MATH_SOURCE =
  "CCSS-aligned; original items for grades 1–2 (EngageNY/Eureka Math formats)";

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
    requiresScratchpad: partial.requiresScratchpad ?? false,
    mistakeCategoriesJson: partial.mistakeCategoriesJson ?? ["fact_error"],
  };
}

function countingTo20(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => {
    const start = randInt(rng, 0, 15);
    const step = i % 2 === 0 ? 1 : -1;
    const target = Math.max(0, Math.min(20, start + step * randInt(rng, 1, 5)));
    return p(
      {
        type: "NUMERIC",
        prompt: `Count ${step > 0 ? "forward" : "backward"} from ${start}. What number comes next?`,
        correctAnswer: String(target),
        explanation: `From ${start}, the next number is ${target}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function countingTo100(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const n = randInt(rng, 10, 99);
    const next = n + 1;
    return p(
      {
        type: "NUMERIC",
        prompt: `What number comes after ${n}?`,
        correctAnswer: String(next),
        explanation: `${n} + 1 = ${next}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function comparingNumbers(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 1, 20);
    let b = randInt(rng, 1, 20);
    while (b === a) b = randInt(rng, 1, 20);
    const correct = a > b ? ">" : a < b ? "<" : "=";
    return p(
      {
        type: "SHORT_ANSWER",
        prompt: `${a} ___ ${b}  (use >, <, or =)`,
        correctAnswer: correct,
        explanation: `${a} is ${a > b ? "greater than" : "less than"} ${b}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

const SHAPES = [
  { name: "circle", sides: 0 },
  { name: "triangle", sides: 3 },
  { name: "square", sides: 4 },
  { name: "rectangle", sides: 4 },
  { name: "hexagon", sides: 6 },
];

function shapesPatterns(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const shape = SHAPES[i % SHAPES.length];
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `How many sides does a ${shape.name} have?`,
            correctAnswer: String(shape.sides),
            explanation: `A ${shape.name} has ${shape.sides} sides.`,
            difficulty: 1,
          },
          grade,
        ),
      );
    } else {
      const seq = [2, 4, 6, 8];
      const idx = i % (seq.length - 1);
      problems.push(
        p(
          {
            type: "NUMERIC",
            prompt: `Pattern: ${seq.slice(0, idx + 2).join(", ")}, ?`,
            correctAnswer: String(seq[idx + 1]),
            explanation: `Add 2 each time: next is ${seq[idx + 1]}.`,
            difficulty: 1,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function tellingTimeBasics(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const hour = randInt(rng, 1, 12);
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Clock shows hour hand on ${hour}, minute hand on 12. What time? (e.g. 3:00)`,
            correctAnswer: `${hour}:00`,
            acceptableAnswersJson: [`${hour}:00`, `${hour}:0`],
            explanation: `Minute hand on 12 means o'clock: ${hour}:00.`,
            difficulty: 1,
          },
          grade,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Clock shows hour hand on ${hour}, minute hand on 6. What time? (e.g. 3:30)`,
            correctAnswer: `${hour}:30`,
            explanation: `Minute hand on 6 means half past: ${hour}:30.`,
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

function measurementLength(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 3, 15);
    const b = randInt(rng, 1, a - 1);
    return p(
      {
        type: "NUMERIC",
        prompt: `Stick A is ${a} cm. Stick B is ${b} cm. How much longer is A?`,
        correctAnswer: String(a - b),
        explanation: `${a} − ${b} = ${a - b} cm longer.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function simpleWordProblems(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, 1, 10 - a);
    const join = rng() > 0.5;
    if (join) {
      return p(
        {
          type: "NUMERIC",
          prompt: `Sam has ${a} apples. Gets ${b} more. Total?`,
          correctAnswer: String(a + b),
          explanation: `${a} + ${b} = ${a + b}.`,
          difficulty: 1,
        },
        grade,
      );
    }
    const total = a + b;
    return p(
      {
        type: "NUMERIC",
        prompt: `There are ${total} birds. ${b} fly away. How many left?`,
        correctAnswer: String(total - b),
        explanation: `${total} − ${b} = ${total - b}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function skipCounting(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const steps = [2, 5, 10];
  return Array.from({ length: count }, (_, i) => {
    const step = steps[i % steps.length];
    const start = randInt(rng, 0, step);
    const n = start + step * randInt(rng, 1, 5);
    return p(
      {
        type: "NUMERIC",
        prompt: `Skip count by ${step}s from ${start}: ${start}, ${start + step}, ?`,
        correctAnswer: String(n),
        explanation: `Add ${step}: ${start + step} + ${step} = ${n}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function twoDigitAdd(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 10, 49);
    const b = randInt(rng, 10, 50 - (a % 10));
    const onesA = a % 10;
    const onesB = b % 10;
    const safeB = onesA + onesB <= 9 ? b : randInt(rng, 10, 40);
    return p(
      {
        type: "NUMERIC",
        prompt: `${a} + ${safeB} = ?`,
        correctAnswer: String(a + safeB),
        explanation: `${a} + ${safeB} = ${a + safeB}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function twoDigitSub(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const a = randInt(rng, 20, 89);
    const b = randInt(rng, 10, a - 10);
    const onesA = a % 10;
    const onesB = b % 10;
    const safeB = onesA >= onesB ? b : Math.floor(b / 10) * 10;
    return p(
      {
        type: "NUMERIC",
        prompt: `${a} − ${safeB} = ?`,
        correctAnswer: String(a - safeB),
        explanation: `${a} − ${safeB} = ${a - safeB}.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function placeValue100(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => {
    const tens = randInt(rng, 1, 9);
    const ones = randInt(rng, 0, 9);
    const n = tens * 10 + ones;
    if (rng() > 0.5) {
      return p(
        {
          type: "NUMERIC",
          prompt: `How many tens in ${n}?`,
          correctAnswer: String(tens),
          explanation: `${n} = ${tens} tens and ${ones} ones.`,
          difficulty: 1,
        },
        grade,
      );
    }
    return p(
      {
        type: "NUMERIC",
        prompt: `What is the value of the ones digit in ${n}?`,
        correctAnswer: String(ones),
        explanation: `The ones digit is ${ones}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function money(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const coins = [
    { name: "quarter", cents: 25 },
    { name: "dime", cents: 10 },
    { name: "nickel", cents: 5 },
    { name: "penny", cents: 1 },
  ];
  return Array.from({ length: count }, (_, i) => {
    const c = coins[i % coins.length];
    const n = randInt(rng, 1, 4);
    return p(
      {
        type: "NUMERIC",
        prompt: `${n} ${c.name}${n > 1 ? "s" : ""} = ? cents`,
        correctAnswer: String(c.cents * n),
        explanation: `${n} × ${c.cents}¢ = ${c.cents * n}¢.`,
        difficulty: 2,
      },
      grade,
    );
  });
}

function introMultiplication(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const tables = [2, 5, 10];
  return Array.from({ length: count }, (_, i) => {
    const t = tables[i % tables.length];
    const n = randInt(rng, 1, 10);
    return p(
      {
        type: "NUMERIC",
        prompt: `${n} groups of ${t} = ?`,
        correctAnswer: String(n * t),
        explanation: `${n} × ${t} = ${n * t}.`,
        difficulty: 1,
      },
      grade,
    );
  });
}

function geometryShapes(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const items = [
    { shape: "cube", faces: 6 },
    { shape: "sphere", faces: 0 },
    { shape: "cylinder", faces: 2 },
    { shape: "cone", faces: 1 },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return p(
      {
        type: "NUMERIC",
        prompt: `How many flat faces does a ${item.shape} have?`,
        correctAnswer: String(item.faces),
        explanation: `A ${item.shape} has ${item.faces} flat face(s).`,
        difficulty: 2,
      },
      grade,
    );
  });
}

export const MATH_BUILDERS_G1_G2: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Counting to 20": countingTo20,
  "Counting to 100": countingTo100,
  "Comparing Numbers": comparingNumbers,
  "Shapes & Patterns": shapesPatterns,
  "Telling Time Basics": tellingTimeBasics,
  "Measurement Length": measurementLength,
  "Simple Word Problems": simpleWordProblems,
  "Skip Counting": skipCounting,
  "Two-Digit Addition": twoDigitAdd,
  "Two-Digit Subtraction": twoDigitSub,
  "Place Value to 100": placeValue100,
  Money: money,
  "Intro Multiplication": introMultiplication,
  "Geometry Shapes": geometryShapes,
};
