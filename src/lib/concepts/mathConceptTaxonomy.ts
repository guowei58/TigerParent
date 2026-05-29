export type ConceptSeed = {
  subject: string;
  gradeLevel: number;
  domain: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
};

/** Grade 5 math concept taxonomy (expandable). */
export const GRADE_5_MATH_CONCEPTS: ConceptSeed[] = [
  { subject: "math", gradeLevel: 5, domain: "Operations & Algebraic Thinking", name: "Numerical Expressions", slug: "g5-numerical-expressions", sortOrder: 10 },
  { subject: "math", gradeLevel: 5, domain: "Operations & Algebraic Thinking", name: "Order of Operations", slug: "g5-order-of-operations", sortOrder: 11 },
  { subject: "math", gradeLevel: 5, domain: "Operations & Algebraic Thinking", name: "Word Problems with Operations", slug: "g5-word-problems-operations", sortOrder: 12 },
  { subject: "math", gradeLevel: 5, domain: "Operations & Algebraic Thinking", name: "Patterns", slug: "g5-patterns", sortOrder: 13 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Place Value", slug: "g5-place-value", sortOrder: 20 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Powers of Ten", slug: "g5-powers-of-ten", sortOrder: 21 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Decimal Comparison", slug: "g5-decimal-comparison", sortOrder: 22 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Decimal Rounding", slug: "g5-decimal-rounding", sortOrder: 23 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Decimal Addition and Subtraction", slug: "g5-decimal-add-sub", sortOrder: 24 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Decimal Multiplication", slug: "g5-decimal-multiplication", sortOrder: 25 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Decimal Division", slug: "g5-decimal-division", sortOrder: 26 },
  { subject: "math", gradeLevel: 5, domain: "Number & Operations in Base Ten", name: "Multi-Digit Division", slug: "g5-multi-digit-division", sortOrder: 27 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Equivalent Fractions", slug: "g5-equivalent-fractions", sortOrder: 30 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Adding Fractions", slug: "g5-adding-fractions", sortOrder: 31 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Subtracting Fractions", slug: "g5-subtracting-fractions", sortOrder: 32 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Multiplying Fractions", slug: "g5-multiplying-fractions", sortOrder: 33 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Dividing Unit Fractions", slug: "g5-dividing-unit-fractions", sortOrder: 34 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Fractions as Division", slug: "g5-fractions-as-division", sortOrder: 35 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Mixed Numbers", slug: "g5-mixed-numbers", sortOrder: 36 },
  { subject: "math", gradeLevel: 5, domain: "Fractions", name: "Fraction Word Problems", slug: "g5-fraction-word-problems", sortOrder: 37 },
  { subject: "math", gradeLevel: 5, domain: "Ratios & Proportional Reasoning", name: "Ratio Language", slug: "g5-ratio-language", sortOrder: 40 },
  { subject: "math", gradeLevel: 5, domain: "Ratios & Proportional Reasoning", name: "Unit Rates", slug: "g5-unit-rates", sortOrder: 41 },
  { subject: "math", gradeLevel: 5, domain: "Measurement & Data", name: "Unit Conversion", slug: "g5-unit-conversion", sortOrder: 50 },
  { subject: "math", gradeLevel: 5, domain: "Measurement & Data", name: "Volume", slug: "g5-volume", sortOrder: 51 },
  { subject: "math", gradeLevel: 5, domain: "Measurement & Data", name: "Area", slug: "g5-area", sortOrder: 52 },
  { subject: "math", gradeLevel: 5, domain: "Measurement & Data", name: "Perimeter", slug: "g5-perimeter", sortOrder: 53 },
  { subject: "math", gradeLevel: 5, domain: "Measurement & Data", name: "Measurement Word Problems", slug: "g5-measurement-word-problems", sortOrder: 54 },
  { subject: "math", gradeLevel: 5, domain: "Geometry", name: "Polygons", slug: "g5-polygons", sortOrder: 60 },
  { subject: "math", gradeLevel: 5, domain: "Geometry", name: "Quadrilaterals", slug: "g5-quadrilaterals", sortOrder: 61 },
  { subject: "math", gradeLevel: 5, domain: "Geometry", name: "Coordinate Plane", slug: "g5-coordinate-plane", sortOrder: 62 },
  { subject: "math", gradeLevel: 5, domain: "Data & Graphs", name: "Line Plots", slug: "g5-line-plots", sortOrder: 70 },
  { subject: "math", gradeLevel: 5, domain: "Data & Graphs", name: "Tables and Charts", slug: "g5-tables-charts", sortOrder: 71 },
  { subject: "math", gradeLevel: 5, domain: "Data & Graphs", name: "Multi-Step Data Problems", slug: "g5-data-multi-step", sortOrder: 72 },
];

export function allConceptSeeds(): ConceptSeed[] {
  return [...GRADE_5_MATH_CONCEPTS];
}
