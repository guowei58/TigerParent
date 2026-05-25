import type { GeneratedMathProblem } from "@/lib/content-validation/types";
import {
  generateAdditionFact,
  generateAreaRectangle,
  generateDecimalOperation,
  generateDivisionFact,
  generateFractionAdditionLike,
  generateFractionUnlikeAddition,
  generateIntegerOperation,
  generateLongDivision,
  generateMultiDigitMultiplication,
  generateMultiplicationFact,
  generateMultiStepEquation,
  generateOneStepEquation,
  generateOrderOfOperations,
  generatePercentOfNumber,
  generatePerimeter,
  generateRatio,
  generateSubtractionFact,
  generateVolume,
} from "./topics";

export type GeneratorContext = {
  grade: number;
  skillTitle: string;
  seed: number;
};

export type MathGenerator = (ctx: GeneratorContext, index: number) => GeneratedMathProblem;

export const MATH_GENERATOR_REGISTRY: Record<string, MathGenerator> = {
  "Addition Facts to 10": generateAdditionFact,
  "Addition Facts to 20": generateAdditionFact,
  "Subtraction Facts to 10": generateSubtractionFact,
  "Subtraction Facts to 20": generateSubtractionFact,
  "Multiplication ×0, ×1, ×2, ×5": generateMultiplicationFact,
  "Multiplication ×3 & ×4": generateMultiplicationFact,
  "Multiplication ×6 & ×7": generateMultiplicationFact,
  "Multiplication ×8 & ×9": generateMultiplicationFact,
  "Multiplication ×10, ×11, ×12": generateMultiplicationFact,
  "Multiplication Mixed 0–12": generateMultiplicationFact,
  "Division ÷2–÷5": generateDivisionFact,
  "Division ÷6–÷9": generateDivisionFact,
  "Division ÷10–÷12": generateDivisionFact,
  "Division Mixed": generateDivisionFact,
  "Multi-Digit Multiplication 2×1": generateMultiDigitMultiplication,
  "Multi-Digit Multiplication 2×2": generateMultiDigitMultiplication,
  "Long Division 1-Digit Divisor": generateLongDivision,
  "Long Division with Remainders": generateLongDivision,
  "Add Fractions Like Denominators": generateFractionAdditionLike,
  "Subtract Fractions Like Denominators": generateFractionAdditionLike,
  "Add Fractions Unlike Denominators": generateFractionUnlikeAddition,
  "Subtract Fractions Unlike Denominators": generateFractionUnlikeAddition,
  "Decimal Addition & Subtraction": generateDecimalOperation,
  "Decimal Multiplication": generateDecimalOperation,
  "Decimal Division": generateDecimalOperation,
  "Percent Introduction": generatePercentOfNumber,
  "Percent of a Number": generatePercentOfNumber,
  "Percent Applications": generatePercentOfNumber,
  "Ratios": generateRatio,
  "Unit Rates": generateRatio,
  "Integer Addition & Subtraction": generateIntegerOperation,
  "Integer Multiplication & Division": generateIntegerOperation,
  "One-Step Equations": generateOneStepEquation,
  "Two-Step Equations": generateMultiStepEquation,
  "Multi-Step Equations": generateMultiStepEquation,
  "Order of Operations": generateOrderOfOperations,
  "Area of Rectangles": generateAreaRectangle,
  Perimeter: generatePerimeter,
  Volume: generateVolume,
};

export function generateDeterministicMathProblem(
  skillTitle: string,
  grade: number,
  index: number,
  seed = 0,
): GeneratedMathProblem | null {
  const generator = MATH_GENERATOR_REGISTRY[skillTitle];
  if (!generator) return null;
  return generator({ grade, skillTitle, seed }, index);
}

export {
  generateAdditionFact,
  generateFractionAdditionLike,
} from "./topics";
