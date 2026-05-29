import type { PracticeConcept } from "@/generated/prisma/client";
import { keywordClassifyConcept } from "@/lib/concepts/matchConcept";

export type ConceptClassification = {
  primaryConceptSlug: string;
  primaryConceptName: string;
  domain: string;
  secondaryConceptSlugs: string[];
  topic: string;
  subtopic: string;
  standardGuess: string | null;
  difficultyGuess: string;
  classificationConfidence: number;
  reasoning: string;
  warnings: string[];
};

export function classifyProblemConcept(
  cleanedText: string,
  concepts: PracticeConcept[],
  gradeLevel: number,
): ConceptClassification {
  const match = keywordClassifyConcept(cleanedText, concepts);
  if (!match) {
    return {
      primaryConceptSlug: "g5-word-problems-operations",
      primaryConceptName: "Word Problems with Operations",
      domain: "Operations & Algebraic Thinking",
      secondaryConceptSlugs: [],
      topic: "General",
      subtopic: "Unclassified",
      standardGuess: null,
      difficultyGuess: "medium",
      classificationConfidence: 0.2,
      reasoning: "No keyword match",
      warnings: ["Low classification confidence"],
    };
  }

  return {
    primaryConceptSlug: match.concept.slug,
    primaryConceptName: match.concept.name,
    domain: match.concept.domain,
    secondaryConceptSlugs: [],
    topic: match.concept.domain,
    subtopic: match.concept.name,
    standardGuess: null,
    difficultyGuess: match.confidence > 0.6 ? "medium" : "hard",
    classificationConfidence: match.confidence,
    reasoning: match.reasoning,
    warnings: match.confidence < 0.5 ? ["Low classification confidence"] : [],
  };
}
