import type { ConceptSeed } from "./mathConceptTaxonomy";

/** Cross-grade ELA reading concepts (gradeLevel null = applies to all grades). */
export const ELA_READING_CONCEPTS: ConceptSeed[] = [
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Literature",
    name: "Main Idea & Theme",
    slug: "ela-main-idea-theme",
    sortOrder: 10,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Literature",
    name: "Character & Plot",
    slug: "ela-character-plot",
    sortOrder: 11,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Literature",
    name: "Vocabulary in Context",
    slug: "ela-vocabulary-context",
    sortOrder: 12,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Literature",
    name: "Figurative Language",
    slug: "ela-figurative-language",
    sortOrder: 13,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Literature",
    name: "Author's Craft & Structure",
    slug: "ela-authors-craft",
    sortOrder: 14,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Informational",
    name: "Central Ideas & Evidence",
    slug: "ela-central-ideas",
    sortOrder: 20,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Informational",
    name: "Author's Purpose & Point of View",
    slug: "ela-authors-purpose",
    sortOrder: 21,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Reading Informational",
    name: "Arguments & Claims",
    slug: "ela-arguments-claims",
    sortOrder: 22,
  },
  {
    subject: "english",
    gradeLevel: 0,
    domain: "Writing & Language",
    name: "Short Response / Evidence",
    slug: "ela-short-response",
    sortOrder: 30,
  },
];

export function classifyElaConceptSlug(cleanedText: string): string {
  const t = cleanedText.toLowerCase();
  if (/figurative|simile|metaphor|personification|symbol/.test(t)) return "ela-figurative-language";
  if (/vocabulary|meaning of the word|word.*mean|context clues/.test(t))
    return "ela-vocabulary-context";
  if (/author|point of view|perspective|tone|craft|structure|why does the author/.test(t))
    return "ela-authors-craft";
  if (/central idea|main idea|theme|detail best expresses/.test(t)) return "ela-main-idea-theme";
  if (/character|plot|story|conflict|dialogue/.test(t)) return "ela-character-plot";
  if (/argument|claim|evidence|reasoning|article|informational/.test(t))
    return "ela-central-ideas";
  if (/explain|use two details|support your|short response|worth \d+ credits/.test(t))
    return "ela-short-response";
  return "ela-main-idea-theme";
}
