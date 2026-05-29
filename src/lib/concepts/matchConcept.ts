import type { PracticeConcept } from "@/generated/prisma/client";

const KEYWORD_RULES: { pattern: RegExp; slug: string }[] = [
  { pattern: /line plot|dot plot/i, slug: "g5-line-plots" },
  { pattern: /volume|cubic/i, slug: "g5-volume" },
  { pattern: /area|square unit/i, slug: "g5-area" },
  { pattern: /perimeter/i, slug: "g5-perimeter" },
  { pattern: /coordinate|plot the point/i, slug: "g5-coordinate-plane" },
  { pattern: /rhombus|rectangle|parallelogram|quadrilateral/i, slug: "g5-quadrilaterals" },
  { pattern: /ratio|unit rate/i, slug: "g5-unit-rates" },
  { pattern: /multiply.*fraction|fraction.*multiply/i, slug: "g5-multiplying-fractions" },
  { pattern: /add.*fraction|fraction.*add/i, slug: "g5-adding-fractions" },
  { pattern: /subtract.*fraction/i, slug: "g5-subtracting-fractions" },
  { pattern: /equivalent fraction/i, slug: "g5-equivalent-fractions" },
  { pattern: /decimal/i, slug: "g5-decimal-multiplication" },
  { pattern: /divide|division|÷/i, slug: "g5-multi-digit-division" },
  { pattern: /expression|parenthes/i, slug: "g5-numerical-expressions" },
  { pattern: /table|chart|graph/i, slug: "g5-tables-charts" },
];

export function keywordClassifyConcept(
  text: string,
  concepts: PracticeConcept[],
): { concept: PracticeConcept; confidence: number; reasoning: string } | null {
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(text)) {
      const concept = concepts.find((c) => c.slug === rule.slug);
      if (concept) {
        return {
          concept,
          confidence: 0.65,
          reasoning: `Keyword match: ${rule.pattern}`,
        };
      }
    }
  }
  const fallback = concepts.find((c) => c.slug === "g5-word-problems-operations");
  if (fallback) {
    return { concept: fallback, confidence: 0.35, reasoning: "Default fallback: word problems" };
  }
  return null;
}
