import type { GeneratedMathProblem } from "@/lib/content-validation/types";
import type { GeneratorContext } from "./index";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function simplify(num: number, den: number) {
  const g = gcd(Math.abs(num), Math.abs(den));
  return { num: num / g, den: den / g };
}

function baseNumeric(
  ctx: GeneratorContext,
  index: number,
  opts: Partial<GeneratedMathProblem> & Pick<GeneratedMathProblem, "prompt" | "correctAnswer" | "explanation">,
): GeneratedMathProblem {
  return {
    type: "NUMERIC",
    solutionStepsJson: opts.solutionStepsJson ?? [opts.explanation],
    commonMistakeTagsJson: opts.commonMistakeTagsJson ?? ["computational_error"],
    misconceptionTagsJson: opts.misconceptionTagsJson ?? ["computational_error"],
    difficulty: opts.difficulty ?? 3,
    gradeLevel: ctx.grade,
    targetSeconds: opts.targetSeconds ?? 30,
    cognitiveLevel: opts.cognitiveLevel ?? "PROCEDURAL",
    answerValidationMethod: opts.answerValidationMethod ?? "NUMERIC_TOLERANCE",
    requiresScratchpad: opts.requiresScratchpad ?? false,
    acceptableAnswersJson: opts.acceptableAnswersJson,
    ...opts,
  };
}

export function generateAdditionFact(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const a = (index % 9) + 1;
  const b = ((index * 3) % 9) + 1;
  const sum = a + b;
  return baseNumeric(ctx, index, {
    prompt: `${a} + ${b} = ?`,
    correctAnswer: String(sum),
    explanation: `${a} + ${b} = ${sum}.`,
    solutionStepsJson: [`Start with ${a}.`, `Add ${b}.`, `The sum is ${sum}.`],
    difficulty: 1,
    targetSeconds: 8,
    cognitiveLevel: "RECALL",
  });
}

export function generateSubtractionFact(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const a = (index % 9) + 2;
  const b = (index % a) + 1;
  const diff = a - b;
  return baseNumeric(ctx, index, {
    prompt: `${a} − ${b} = ?`,
    correctAnswer: String(diff),
    explanation: `${a} − ${b} = ${diff}.`,
    solutionStepsJson: [`Start with ${a}.`, `Take away ${b}.`, `The difference is ${diff}.`],
    difficulty: 1,
    targetSeconds: 9,
    cognitiveLevel: "RECALL",
    misconceptionTagsJson: ["reversed_minuend_subtrahend"],
  });
}

export function generateMultiplicationFact(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const tables = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const a = tables[index % tables.length]!;
  const b = tables[(index * 2 + 1) % tables.length]!;
  const product = a * b;
  return baseNumeric(ctx, index, {
    prompt: `${a} × ${b} = ?`,
    correctAnswer: String(product),
    explanation: `${a} × ${b} = ${product}.`,
    solutionStepsJson: [`Think: ${a} groups of ${b}.`, `The product is ${product}.`],
    difficulty: 2,
    targetSeconds: 8,
    cognitiveLevel: "RECALL",
    misconceptionTagsJson: ["added_instead_of_multiplied"],
  });
}

export function generateDivisionFact(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const b = (index % 11) + 2;
  const quotient = (index % 9) + 1;
  const a = b * quotient;
  return baseNumeric(ctx, index, {
    prompt: `${a} ÷ ${b} = ?`,
    correctAnswer: String(quotient),
    explanation: `${b} × ${quotient} = ${a}, so ${a} ÷ ${b} = ${quotient}.`,
    solutionStepsJson: [
      `Ask: ${b} times what equals ${a}?`,
      `${b} × ${quotient} = ${a}.`,
      `So the quotient is ${quotient}.`,
    ],
    difficulty: 2,
    targetSeconds: 10,
    cognitiveLevel: "RECALL",
    misconceptionTagsJson: ["multiplied_instead_of_divided"],
  });
}

export function generateMultiDigitMultiplication(
  ctx: GeneratorContext,
  index: number,
): GeneratedMathProblem {
  const a = 10 + (index % 89);
  const b = 2 + (index % 8);
  const product = a * b;
  return baseNumeric(ctx, index, {
    prompt: `${a} × ${b} = ?`,
    correctAnswer: String(product),
    explanation: `${a} × ${b} = ${product}.`,
    solutionStepsJson: [
      `Multiply ones: ${a % 10} × ${b}.`,
      `Multiply tens and add partial products.`,
      `The product is ${product}.`,
    ],
    difficulty: 4,
    targetSeconds: 35,
    requiresScratchpad: true,
  });
}

export function generateLongDivision(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const divisor = 2 + (index % 8);
  const quotient = 10 + (index % 40);
  const dividend = divisor * quotient;
  return baseNumeric(ctx, index, {
    prompt: `${dividend} ÷ ${divisor} = ?`,
    correctAnswer: String(quotient),
    explanation: `${divisor} × ${quotient} = ${dividend}, so the quotient is ${quotient}.`,
    solutionStepsJson: [
      `How many times does ${divisor} go into ${dividend}?`,
      `${divisor} × ${quotient} = ${dividend}.`,
      `Quotient = ${quotient}.`,
    ],
    difficulty: 5,
    targetSeconds: 45,
    requiresScratchpad: true,
  });
}

export function generateFractionAdditionLike(
  ctx: GeneratorContext,
  index: number,
): GeneratedMathProblem {
  const den = [2, 3, 4, 5, 6, 8][index % 6]!;
  const aNum = (index % (den - 1)) + 1;
  const bNum = ((index + 2) % (den - 1)) + 1;
  const sumNum = aNum + bNum;
  const simplified = simplify(sumNum, den);
  const answer =
    simplified.den === 1 ? String(simplified.num) : `${simplified.num}/${simplified.den}`;

  return baseNumeric(ctx, index, {
    prompt: `${aNum}/${den} + ${bNum}/${den} = ?`,
    correctAnswer: answer,
    acceptableAnswersJson: [`${sumNum}/${den}`, answer],
    explanation: `Add numerators: ${aNum} + ${bNum} = ${sumNum}, so ${sumNum}/${den}${simplified.den === 1 ? "" : ` = ${answer}`}.`,
    solutionStepsJson: [
      "Check that denominators match.",
      "Add the numerators.",
      "Keep the denominator.",
      "Simplify if needed.",
    ],
    difficulty: 4,
    targetSeconds: 45,
    requiresScratchpad: true,
    misconceptionTagsJson: ["added_denominators", "forgot_to_simplify"],
  });
}

export function generateFractionUnlikeAddition(
  ctx: GeneratorContext,
  index: number,
): GeneratedMathProblem {
  const denA = [2, 3, 4, 5][index % 4]!;
  const denB = [3, 4, 5, 6][(index + 1) % 4]!;
  const numA = (index % (denA - 1)) + 1;
  const numB = ((index + 2) % (denB - 1)) + 1;
  const lcd = (denA * denB) / gcd(denA, denB);
  const newA = numA * (lcd / denA);
  const newB = numB * (lcd / denB);
  const sum = newA + newB;
  const simplified = simplify(sum, lcd);
  const answer =
    simplified.den === 1 ? String(simplified.num) : `${simplified.num}/${simplified.den}`;

  return baseNumeric(ctx, index, {
    prompt: `${numA}/${denA} + ${numB}/${denB} = ?`,
    correctAnswer: answer,
    acceptableAnswersJson: [`${sum}/${lcd}`, answer],
    explanation: `Common denominator ${lcd}: ${newA}/${lcd} + ${newB}/${lcd} = ${sum}/${lcd}${simplified.den === 1 ? "" : ` = ${answer}`}.`,
    solutionStepsJson: [
      "Find the least common denominator.",
      "Rewrite each fraction.",
      "Add numerators.",
      "Simplify.",
    ],
    difficulty: 6,
    targetSeconds: 60,
    requiresScratchpad: true,
    misconceptionTagsJson: ["added_denominators", "wrong_common_denominator"],
  });
}

export function generateDecimalOperation(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const a = ((index % 90) + 10) / 10;
  const b = ((index * 3) % 50 + 10) / 10;
  const sum = Math.round((a + b) * 10) / 10;
  return baseNumeric(ctx, index, {
    prompt: `${a} + ${b} = ?`,
    correctAnswer: String(sum),
    explanation: `Line up decimal points: ${a} + ${b} = ${sum}.`,
    solutionStepsJson: ["Align decimal points.", "Add as whole numbers.", `Answer: ${sum}.`],
    difficulty: 4,
    targetSeconds: 35,
    requiresScratchpad: true,
    misconceptionTagsJson: ["misaligned_decimal"],
  });
}

export function generatePercentOfNumber(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const pct = [10, 20, 25, 50][index % 4]!;
  const base = (index % 20 + 1) * 10;
  const answer = (base * pct) / 100;
  return baseNumeric(ctx, index, {
    prompt: `What is ${pct}% of ${base}?`,
    correctAnswer: String(answer),
    explanation: `${pct}% of ${base} = ${pct / 100} × ${base} = ${answer}.`,
    solutionStepsJson: [
      `Convert ${pct}% to ${pct / 100}.`,
      `Multiply by ${base}.`,
      `Result: ${answer}.`,
    ],
    difficulty: 5,
    targetSeconds: 40,
    requiresScratchpad: true,
    misconceptionTagsJson: ["decimal_shift_error"],
  });
}

export function generateRatio(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const a = (index % 5) + 2;
  const b = (index % 7) + 3;
  const g = gcd(a, b);
  return baseNumeric(ctx, index, {
    prompt: `Simplify the ratio ${a}:${b}.`,
    correctAnswer: `${a / g}:${b / g}`,
    acceptableAnswersJson: [`${a / g} to ${b / g}`, `${a / g}/${b / g}`],
    explanation: `Divide both parts by GCF ${g}: ${a / g}:${b / g}.`,
    solutionStepsJson: [`Find GCF of ${a} and ${b}.`, `Divide both terms.`, `Simplified ratio: ${a / g}:${b / g}.`],
    difficulty: 5,
    targetSeconds: 35,
    requiresScratchpad: true,
  });
}

export function generateIntegerOperation(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const a = (index % 10) - 5;
  const b = ((index * 2) % 10) - 5;
  const sum = a + b;
  return baseNumeric(ctx, index, {
    prompt: `${a} + (${b}) = ?`,
    correctAnswer: String(sum),
    explanation: `${a} + (${b}) = ${sum}.`,
    solutionStepsJson: [
      "Identify signs.",
      a >= 0 && b >= 0
        ? "Both positive — add."
        : a < 0 && b < 0
          ? "Both negative — add and keep negative sign."
          : "Different signs — subtract smaller absolute value from larger.",
      `Answer: ${sum}.`,
    ],
    difficulty: 4,
    targetSeconds: 30,
    misconceptionTagsJson: ["sign_error"],
  });
}

export function generateOneStepEquation(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const x = (index % 12) + 1;
  const a = (index % 5) + 2;
  const c = a * x;
  return baseNumeric(ctx, index, {
    prompt: `${a}x = ${c}. What is x?`,
    correctAnswer: String(x),
    explanation: `Divide both sides by ${a}: x = ${c} ÷ ${a} = ${x}.`,
    solutionStepsJson: [
      `Divide both sides by ${a}.`,
      `${c} ÷ ${a} = ${x}.`,
      `x = ${x}.`,
    ],
    difficulty: 5,
    targetSeconds: 40,
    requiresScratchpad: true,
    answerValidationMethod: "NUMERIC_TOLERANCE",
  });
}

export function generateMultiStepEquation(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const x = (index % 8) + 2;
  const a = 2;
  const b = 3;
  const c = a * x + b;
  return baseNumeric(ctx, index, {
    prompt: `${a}x + ${b} = ${c}. What is x?`,
    correctAnswer: String(x),
    explanation: `Subtract ${b}, then divide by ${a}: x = ${x}.`,
    solutionStepsJson: [
      `Subtract ${b} from both sides: ${a}x = ${c - b}.`,
      `Divide by ${a}: x = ${x}.`,
    ],
    difficulty: 6,
    targetSeconds: 50,
    requiresScratchpad: true,
  });
}

export function generateOrderOfOperations(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const a = (index % 5) + 2;
  const b = (index % 4) + 2;
  const c = (index % 3) + 2;
  const answer = a + b * c;
  return baseNumeric(ctx, index, {
    prompt: `${a} + ${b} × ${c} = ?`,
    correctAnswer: String(answer),
    explanation: `Multiply first: ${b} × ${c} = ${b * c}, then add ${a}: ${answer}.`,
    solutionStepsJson: [
      "Multiply before adding (PEMDAS).",
      `${b} × ${c} = ${b * c}.`,
      `${a} + ${b * c} = ${answer}.`,
    ],
    difficulty: 5,
    targetSeconds: 35,
    requiresScratchpad: true,
    misconceptionTagsJson: ["left_to_right_error"],
  });
}

export function generateAreaRectangle(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const length = (index % 10) + 3;
  const width = (index % 8) + 2;
  const area = length * width;
  return baseNumeric(ctx, index, {
    prompt: `A rectangle is ${length} cm long and ${width} cm wide. What is its area in cm²?`,
    correctAnswer: String(area),
    explanation: `Area = length × width = ${length} × ${width} = ${area} cm².`,
    solutionStepsJson: [
      "Use A = l × w.",
      `${length} × ${width} = ${area}.`,
    ],
    difficulty: 4,
    targetSeconds: 35,
    requiresScratchpad: true,
  });
}

export function generatePerimeter(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const length = (index % 10) + 3;
  const width = (index % 8) + 2;
  const perimeter = 2 * (length + width);
  return baseNumeric(ctx, index, {
    prompt: `A rectangle is ${length} cm by ${width} cm. What is its perimeter in cm?`,
    correctAnswer: String(perimeter),
    explanation: `P = 2(l + w) = 2(${length} + ${width}) = ${perimeter} cm.`,
    solutionStepsJson: [
      "Add length and width.",
      "Multiply by 2.",
      `Perimeter = ${perimeter} cm.`,
    ],
    difficulty: 3,
    targetSeconds: 30,
    requiresScratchpad: true,
    misconceptionTagsJson: ["used_area_formula"],
  });
}

export function generateVolume(ctx: GeneratorContext, index: number): GeneratedMathProblem {
  const l = (index % 6) + 2;
  const w = (index % 5) + 2;
  const h = (index % 4) + 2;
  const volume = l * w * h;
  return baseNumeric(ctx, index, {
    prompt: `A box is ${l} cm × ${w} cm × ${h} cm. What is its volume in cm³?`,
    correctAnswer: String(volume),
    explanation: `V = l × w × h = ${l} × ${w} × ${h} = ${volume} cm³.`,
    solutionStepsJson: [
      "Multiply all three dimensions.",
      `${l} × ${w} = ${l * w}.`,
      `${l * w} × ${h} = ${volume}.`,
    ],
    difficulty: 5,
    targetSeconds: 45,
    requiresScratchpad: true,
  });
}
