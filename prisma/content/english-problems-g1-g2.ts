import type { ContentProblem } from "./types";
import { createRng, randInt } from "./rng";
import {
  buildDistractorRationaleJson,
  buildMcqChoices,
  type McqChoiceInput,
} from "../../src/lib/mcq-choices";

const ENGLISH_SOURCE =
  "GENERATED — CCSS ELA-aligned original items for grades 1–2";

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
  difficulty = 1,
  seed = 1,
): ContentProblem {
  const wrong: McqChoiceInput[] = choices
    .filter((c) => c !== correct)
    .map((text) => ({
      text,
      isCorrect: false,
      rationale: `"${text}" is not the best answer.`,
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

const LETTER_WORDS: [string, string][] = [
  ["B", "ball"],
  ["C", "cat"],
  ["D", "dog"],
  ["F", "fish"],
  ["M", "moon"],
  ["S", "sun"],
  ["T", "tree"],
  ["P", "pen"],
];

function letterSounds(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [letter, word] = LETTER_WORDS[i % LETTER_WORDS.length];
    problems.push(
      mc(
        `Which word starts with the letter ${letter}?`,
        [word, "apple", "run", "jump"].sort(() => (i % 3) - 1),
        word,
        `${word} starts with ${letter}.`,
        grade,
        1,
        seed + i,
      ),
    );
  }
  return problems;
}

const SIGHT_WORDS = ["the", "and", "said", "you", "was", "have", "they", "from"];

function sightWords(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const word = SIGHT_WORDS[i % SIGHT_WORDS.length];
    problems.push(
      mc(
        `Read the word: "${word}". Which sentence uses it correctly?`,
        [`I ${word} happy.`, `${word} cat sat.`, `Run ${word} fast.`, `Blue ${word} sky.`].filter(
          (s) => s.includes(word) || s.startsWith(word.charAt(0).toUpperCase()),
        ),
        `The ${word} dog ran.`,
        `"${word}" is a high-frequency sight word.`,
        grade,
        1,
        seed + i,
      ),
    );
  }
  return problems;
}

const RHYME_PAIRS: [string, string][] = [
  ["cat", "hat"],
  ["dog", "log"],
  ["sun", "fun"],
  ["tree", "bee"],
  ["cake", "lake"],
];

function rhymingWords(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = RHYME_PAIRS[i % RHYME_PAIRS.length];
    problems.push(
      mc(
        `Which word rhymes with "${a}"?`,
        [b, "car", "book", "run"],
        b,
        `"${b}" rhymes with "${a}".`,
        grade,
        1,
        seed + i,
      ),
    );
  }
  return problems;
}

function punctuationBasics(grade: number, count: number, seed: number) {
  const items = [
    { q: "What goes at the end of a question?", a: "?", w: [".", "!", ","] },
    { q: "What goes at the end of a statement?", a: ".", w: ["?", "!", ":"] },
    { q: "What goes at the end of an exclamation?", a: "!", w: [".", "?", ","] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q, [item.a, ...item.w], item.a, `${item.a} is correct.`, grade, 1, seed + i);
  });
}

function phonicsDecoding(grade: number, count: number, seed: number) {
  const words = [
    { blend: "bl", word: "blue", wrong: ["clue", "glue", "true"] },
    { blend: "st", word: "stop", wrong: ["shop", "step", "skip"] },
    { blend: "ch", word: "chair", wrong: ["share", "char", "chore"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = words[i % words.length];
    return mc(
      `Blend the sounds: ${item.blend}___`,
      [item.word, ...item.wrong],
      item.word,
      `"${item.word}" uses the ${item.blend} blend.`,
      grade,
      1,
      seed + i,
    );
  });
}

function nounsVerbs(grade: number, count: number, seed: number) {
  const items = [
    { q: "Which is a noun?", a: "dog", w: ["run", "fast", "jump"] },
    { q: "Which is a verb?", a: "jump", w: ["table", "happy", "book"] },
    { q: "Which is a noun?", a: "school", w: ["write", "quickly", "read"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.q, [item.a, ...item.w], item.a, `${item.a} fits the part of speech.`, grade, 1, seed + i);
  });
}

function adjectives(grade: number, count: number, seed: number) {
  const items = [
    { q: "Which word describes the noun?", sentence: "The ___ cat slept.", a: "fluffy", w: ["ran", "quickly", "and"] },
    { q: "Pick the adjective:", sentence: "A ___ day for a picnic.", a: "sunny", w: ["we", "go", "ate"] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(item.sentence, [item.a, ...item.w], item.a, `"${item.a}" describes a noun.`, grade, 1, seed + i);
  });
}

function sentenceTypes(grade: number, count: number, seed: number) {
  const items = [
    { s: "Close the door.", type: "command" },
    { s: "Is it raining?", type: "question" },
    { s: "I like pizza.", type: "statement" },
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = items[i % items.length];
    return mc(
      `"${item.s}" is a:`,
      ["statement", "question", "command", "exclamation"],
      item.type,
      `This sentence is a ${item.type}.`,
      grade,
      1,
      seed + i,
    );
  });
}

export const ENGLISH_BUILDERS_G1_G2: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Letter Sounds": letterSounds,
  "Sight Words": sightWords,
  "Rhyming Words": rhymingWords,
  "Punctuation Basics": punctuationBasics,
  "Phonics & Decoding": phonicsDecoding,
  "Nouns & Verbs": nounsVerbs,
  Adjectives: adjectives,
  "Sentence Types": sentenceTypes,
};
