import type { ContentProblem } from "./types";
import { createRng } from "./rng";
import {
  buildDistractorRationaleJson,
  buildMcqChoices,
  type McqChoiceInput,
} from "../../src/lib/mcq-choices";
import { passagesForGrade, type Passage } from "./passages";

const ENGLISH_SOURCE =
  "GENERATED — CCSS ELA-aligned original items for grades 8–12";

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
    sourceAttribution: ENGLISH_SOURCE,
    requiresScratchpad: partial.requiresScratchpad ?? false,
    mistakeCategoriesJson: partial.mistakeCategoriesJson ?? ["comprehension_error"],
  };
}

function mc(
  prompt: string,
  choices: string[],
  correct: string,
  explanation: string,
  grade: number,
  difficulty = 3,
  seed = 1,
): ContentProblem {
  const wrong: McqChoiceInput[] = choices
    .filter((c) => c !== correct)
    .map((text) => ({
      text,
      isCorrect: false,
      rationale: `"${text}" is not the strongest answer.`,
      misconception: "comprehension_error",
    }));
  const built = buildMcqChoices(
    [{ text: correct, isCorrect: true, rationale: explanation }, ...wrong],
    seed,
  );
  return p(
    {
      type: "MULTIPLE_CHOICE",
      prompt,
      choicesJson: built.choicesJson,
      choicesWithIdsJson: built.choices,
      correctChoiceId: built.correctChoiceId,
      correctAnswer: correct,
      explanation,
      difficulty,
      distractorRationaleJson: buildDistractorRationaleJson(built.choices),
      contentClass: "GENERATED",
      usageType: "CONCEPT_PRACTICE",
    },
    grade,
  );
}

function passageBlock(passage: Passage) {
  return `Read the passage:\n\n"${passage.title}"\n${passage.text}\n\n`;
}

function buildFromPassages(
  grade: number,
  count: number,
  seed: number,
  fn: (passage: Passage, i: number, itemSeed: number) => ContentProblem,
) {
  const bank = passagesForGrade(grade);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const passage = bank[i % bank.length] ?? bank[0];
    problems.push(fn(passage, i, seed + i * 17));
  }
  return problems;
}

function argumentWriting(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "A strong argument paragraph should:",
      ["State a claim with reasons and evidence", "List random facts", "Only tell a story", "Avoid a thesis"],
      "State a claim with reasons and evidence",
      "Arguments need claim, reasons, and evidence.",
      grade,
      3,
      seed + i,
    ),
  );
}

function literaryAnalysis(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, itemSeed) =>
    mc(
      `${passageBlock(passage)}Which literary element is most prominent?`,
      ["Theme", "Setting only", "Font size", "Page count"],
      passage.theme ? "Theme" : "Setting only",
      passage.theme
        ? `Theme: ${passage.theme}`
        : "Setting helps establish context in the passage.",
      grade,
      3,
      itemSeed,
    ),
  );
}

function researchCitations(grade: number, count: number, seed: number) {
  const items = [
    { q: "A credible source is usually:", a: "Written by an expert with evidence", w: ["Anonymous with no date", "Pure opinion", "A meme"] },
    { q: "When quoting, you should:", a: "Use quotation marks and cite the source", w: ["Copy without credit", "Change every word silently", "Skip the author"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q, [item.a, ...item.w], item.a, item.a, grade, 3, seed + i);
  });
}

function mediaLiteracy(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "When evaluating an online article, first check:",
      ["Author, date, and evidence", "Number of emojis", "Color of the website", "How fast it loads"],
      "Author, date, and evidence",
      "Credibility depends on authorship, timeliness, and evidence.",
      grade,
      3,
      seed + i,
    ),
  );
}

function literaryDevices(grade: number, count: number, seed: number) {
  const items = [
    { q: `"The classroom was a zoo" is:`, a: "a metaphor", w: ["a simile", "alliteration", "hyperbole only"] },
    { q: `"Brave as a lion" is:`, a: "a simile", w: ["a metaphor", "irony", "oxymoron"] },
    { q: `"The pen is mightier than the sword" suggests:`, a: "ideas can outweigh force", w: ["pens are weapons", "swords are useless", "writing is easy"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q, [item.a, ...item.w], item.a, item.a, grade, 3, seed + i);
  });
}

function poetryAnalysis(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "In poetry, the pattern of stressed and unstressed syllables is called:",
      ["meter", "paragraph", "chapter", "index"],
      "meter",
      "Meter is the rhythmic pattern in poetry.",
      grade,
      3,
      seed + i,
    ),
  );
}

function narrativeWriting(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "A narrative hook should:",
      ["Grab the reader's attention early", "List every character's age", "Skip the setting", "End the story"],
      "Grab the reader's attention early",
      "Hooks draw readers into the narrative.",
      grade,
      3,
      seed + i,
    ),
  );
}

function persuasiveWriting(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "Persuasive writing most needs:",
      ["A clear claim and supporting evidence", "Only emotional language", "No counterarguments", "Random anecdotes only"],
      "A clear claim and supporting evidence",
      "Persuasion relies on claims backed by evidence.",
      grade,
      3,
      seed + i,
    ),
  );
}

function themeAnalysis(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, itemSeed) =>
    mc(
      `${passageBlock(passage)}What theme is suggested?`,
      [passage.theme ?? passage.mainIdea, passage.title, passage.supportingDetails[0], "None"],
      passage.theme ?? passage.mainIdea,
      `Theme reflects the broader message: ${passage.theme ?? passage.mainIdea}.`,
      grade,
      3,
      itemSeed,
    ),
  );
}

function worldLiterature(grade: number, count: number, seed: number) {
  return literaryAnalysis(grade, count, seed + 1);
}

function americanLiterature(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, itemSeed) =>
    mc(
      `${passageBlock(passage)}What does the author suggest about American society?`,
      [passage.mainIdea, passage.title, "Nothing", passage.supportingDetails[0]],
      passage.mainIdea,
      "Look for the central message about society in the passage.",
      grade,
      3,
      itemSeed,
    ),
  );
}

function criticalAnalysis(grade: number, count: number, seed: number) {
  return literaryAnalysis(grade, count, seed + 2);
}

function mlaCitations(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "In MLA format, an in-text citation includes:",
      ["Author and page number", "Only the URL", "The publisher address", "The ISBN alone"],
      "Author and page number",
      "MLA in-text citations typically use author and page.",
      grade,
      3,
      seed + i,
    ),
  );
}

function satireIrony(grade: number, count: number, seed: number) {
  const items = [
    { q: "Satire often uses ___ to criticize.", a: "humor and exaggeration", w: ["literal praise only", "random facts", "no point of view"] },
    { q: "Verbal irony is when:", a: "someone says the opposite of what they mean", w: ["it rains on a picnic", "a character is brave", "the plot repeats"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q, [item.a, ...item.w], item.a, item.a, grade, 3, seed + i);
  });
}

function researchPapers(grade: number, count: number, seed: number) {
  return researchCitations(grade, count, seed + 3);
}

function collegeEssayPrep(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "A strong college essay should:",
      ["Show personal insight and specific details", "List every award you've won", "Use slang throughout", "Avoid any reflection"],
      "Show personal insight and specific details",
      "College essays reveal who you are through specific stories.",
      grade,
      3,
      seed + i,
    ),
  );
}

function britishLiterature(grade: number, count: number, seed: number) {
  return literaryAnalysis(grade, count, seed + 4);
}

function literaryCriticism(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "Literary criticism analyzes:",
      ["How meaning is created in a text", "Only the author's birthday", "Book sales figures", "Font choices only"],
      "How meaning is created in a text",
      "Criticism examines how texts create meaning.",
      grade,
      3,
      seed + i,
    ),
  );
}

function apLiteratureSkills(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, itemSeed) =>
    mc(
      `${passageBlock(passage)}Which choice best states the author's purpose?`,
      [
        passage.claim ?? passage.mainIdea,
        passage.supportingDetails[0],
        passage.title,
        "To confuse the reader",
      ],
      passage.claim ?? passage.mainIdea,
      "Purpose is what the author wants the reader to understand or do.",
      grade,
      4,
      itemSeed,
    ),
  );
}

function capstoneWriting(grade: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) =>
    mc(
      "A capstone essay requires:",
      ["Sustained argument with multiple sources", "One paragraph only", "No thesis", "Only quotes without analysis"],
      "Sustained argument with multiple sources",
      "Capstone writing integrates research into a sustained argument.",
      grade,
      4,
      seed + i,
    ),
  );
}

function independentResearch(grade: number, count: number, seed: number) {
  return researchCitations(grade, count, seed + 5);
}

function rhetoricalAnalysis(grade: number, count: number, seed: number) {
  const items = [
    { q: "Analyzing word choice helps reveal:", a: "tone and purpose", w: ["page length", "binding type", "ISBN"] },
    { q: "Anaphora is:", a: "repetition at the start of sentences", w: ["a type of rhyme", "a font style", "a chapter title"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q, [item.a, "page length", "binding type", "ISBN"], item.a, item.a, grade, 3, seed + i);
  });
}

function verbTenseAgreement(grade: number, count: number, seed: number) {
  const items = [
    { q: "Fix: She ___ to school every day.", a: "walks", w: ["walk", "walking", "walked"] },
    { q: "Fix: They ___ the project yesterday.", a: "finished", w: ["finish", "finishes", "finishing"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q.replace("Fix: ", "Choose the correct verb: "), [item.a, ...item.w], item.a, `"${item.a}" matches subject and tense.`, grade, 2, seed + i);
  });
}

export const ENGLISH_BUILDERS_G8_G12: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Argument Writing": argumentWriting,
  "Literary Analysis": literaryAnalysis,
  "Research & Citations": researchCitations,
  "Media Literacy": mediaLiteracy,
  "Literary Devices": literaryDevices,
  "Poetry Analysis": poetryAnalysis,
  "Narrative Writing": narrativeWriting,
  "Persuasive Writing": persuasiveWriting,
  "Theme Analysis": themeAnalysis,
  "World Literature": worldLiterature,
  "American Literature": americanLiterature,
  "Critical Analysis": criticalAnalysis,
  "MLA Citations": mlaCitations,
  "Satire & Irony": satireIrony,
  "Research Papers": researchPapers,
  "College Essay Prep": collegeEssayPrep,
  "British Literature": britishLiterature,
  "Literary Criticism": literaryCriticism,
  "AP Literature Skills": apLiteratureSkills,
  "Capstone Writing": capstoneWriting,
  "Independent Research": independentResearch,
  "Rhetorical Analysis": rhetoricalAnalysis,
  "Verb Tense & Agreement": verbTenseAgreement,
};
