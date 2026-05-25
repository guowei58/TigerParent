import type { ContentProblem } from "./types";
import { createRng, randInt, pick } from "./rng";
import {
  buildDistractorRationaleJson,
  buildMcqChoices,
  type McqChoiceInput,
} from "../../src/lib/mcq-choices";

const ENGLISH_SOURCE =
  "GENERATED — CCSS ELA-aligned original items; not official STAAR/SAT content";

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
  difficulty = 2,
  seed = 1,
): ContentProblem {
  const wrong: McqChoiceInput[] = choices
    .filter((c) => c !== correct)
    .map((text) => ({
      text,
      isCorrect: false,
      rationale: `"${text}" reflects a common mistake on this skill.`,
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

const SYNONYMS: [string, string, string[]][] = [
  ["big", "large", ["small", "tiny", "narrow"]],
  ["happy", "glad", ["sad", "angry", "tired"]],
  ["fast", "quick", ["slow", "late", "calm"]],
  ["smart", "clever", ["silly", "lazy", "weak"]],
  ["begin", "start", ["end", "stop", "finish"]],
  ["quiet", "silent", ["loud", "noisy", "bold"]],
  ["brave", "bold", ["afraid", "shy", "weak"]],
  ["angry", "mad", ["calm", "glad", "kind"]],
  ["build", "construct", ["break", "ruin", "hide"]],
  ["fix", "repair", ["break", "harm", "lose"]],
];

const ANTONYMS: [string, string][] = [
  ["hot", "cold"],
  ["day", "night"],
  ["up", "down"],
  ["win", "lose"],
  ["open", "close"],
  ["love", "hate"],
  ["give", "take"],
  ["push", "pull"],
];

function synonymsAntonyms(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const [word, syn, wrong] = SYNONYMS[i % SYNONYMS.length];
      problems.push(
        mc(
          `Synonym for "${word}":`,
          [syn, ...wrong],
          syn,
          `${syn} means about the same as ${word}.`,
          grade,
          1,
        ),
      );
    } else {
      const [a, b] = ANTONYMS[i % ANTONYMS.length];
      problems.push(
        mc(
          `Antonym for "${a}":`,
          [b, a, "same", "similar"],
          b,
          `${b} is the opposite of ${a}.`,
          grade,
          1,
        ),
      );
    }
  }
  return problems;
}

const CAPITAL_RULES = [
  { broken: "my friend sarah lives in texas.", fixed: "My friend Sarah lives in Texas." },
  { broken: "we went to the zoo on monday.", fixed: "We went to the zoo on Monday." },
  { broken: "the cat chased a mouse.", fixed: "The cat chased a mouse." },
  { broken: "i like reading books.", fixed: "I like reading books." },
];

function capitalization(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = CAPITAL_RULES[i % CAPITAL_RULES.length];
    if (i % 2 === 0) {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Fix capitalization: "${item.broken}"`,
            correctAnswer: item.fixed,
            acceptableAnswersJson: [item.fixed.toLowerCase()],
            explanation: "Capitalize sentence starts and proper nouns.",
            difficulty: 1,
          },
          grade,
        ),
      );
    } else {
      problems.push(
        mc(
          `Which is correct?`,
          [item.fixed, item.broken, item.broken.toUpperCase(), "no change needed"],
          item.fixed,
          "Proper capitalization.",
          grade,
          1,
        ),
      );
    }
  }
  return problems;
}

const SPELLING: { prompt: string; correct: string; wrong: string[] }[] = [
  { prompt: "Correct spelling:", correct: "because", wrong: ["becuse", "becaus", "beacuse"] },
  { prompt: "Correct spelling:", correct: "friend", wrong: ["freind", "frend", "friand"] },
  { prompt: "Correct spelling:", correct: "their", wrong: ["thier", "ther", "there"] },
  { prompt: "Correct spelling:", correct: "beautiful", wrong: ["beatiful", "beautful", "beutiful"] },
  { prompt: "Correct spelling:", correct: "question", wrong: ["qustion", "queston", "queshun"] },
];

function spellingPatterns(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = SPELLING[i % SPELLING.length];
    problems.push(
      mc(
        item.prompt,
        [item.correct, ...item.wrong],
        item.correct,
        `${item.correct} is spelled correctly.`,
        grade,
        1,
      ),
    );
  }
  return problems;
}

const PURPOSES = [
  { text: "How to pack a healthy lunch", purpose: "Inform", wrong: ["Entertain", "Persuade", "Confuse"] },
  { text: "A funny poem about a talking dog", purpose: "Entertain", wrong: ["Inform", "Persuade", "Measure"] },
  { text: "Vote for safer crosswalks near our school", purpose: "Persuade", wrong: ["Inform only", "Entertain", "Describe weather"] },
];

function authorsPurpose(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = PURPOSES[i % PURPOSES.length];
    problems.push(
      mc(
        `Author's purpose of "${item.text}":`,
        [item.purpose, ...item.wrong],
        item.purpose,
        `This text mainly tries to ${item.purpose.toLowerCase()}.`,
        grade,
        2,
      ),
    );
  }
  return problems;
}

const SEQUENCE = [
  "First mix the batter. Next pour it in the pan. Then bake for 30 minutes. Finally let it cool.",
  "Seeds sprout. Roots grow down. Leaves reach for sunlight. The plant flowers.",
];

function sequence(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const text = SEQUENCE[i % SEQUENCE.length];
    problems.push(
      mc(
        `What comes FIRST in: "${text}"`,
        [text.split(". ")[0] + ".", text.split(". ")[1] + ".", "Finally step", "Random step"],
        text.split(". ")[0] + ".",
        "First step comes at the beginning.",
        grade,
        2,
      ),
    );
  }
  return problems;
}

function subjectsPredicates(grade: number, count: number, seed: number) {
  const items = [
    { s: "The dog", p: "ran quickly", sentence: "The dog ran quickly." },
    { s: "My sister", p: "reads every night", sentence: "My sister reads every night." },
    { s: "The bright sun", p: "warmed the earth", sentence: "The bright sun warmed the earth." },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    if (i % 2 === 0) {
      problems.push(
        mc(
          `Subject of "${item.sentence}"`,
          [item.s, item.p, "the", "quickly"],
          item.s,
          `Who/what: ${item.s}.`,
          grade,
          2,
        ),
      );
    } else {
      problems.push(
        mc(
          `Predicate of "${item.sentence}"`,
          [item.p, item.s, "the", item.s.split(" ")[1] ?? ""],
          item.p,
          `Action/state: ${item.p}.`,
          grade,
          2,
        ),
      );
    }
  }
  return problems;
}

function causeEffect(grade: number, count: number, seed: number) {
  const pairs = [
    { cause: "It rained all night", effect: "The streets flooded", wrong: ["Birds sang", "The sun set", "School closed forever"] },
    { cause: "She studied hard", effect: "She passed the test", wrong: ["She lost her book", "It snowed", "The bell rang"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = pairs[i % pairs.length];
    problems.push(
      mc(
        `Effect of: "${item.cause}"`,
        [item.effect, ...item.wrong],
        item.effect,
        `${item.cause} leads to ${item.effect}.`,
        grade,
        2,
      ),
    );
  }
  return problems;
}

function compareContrast(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Dogs bark; cats meow. This shows:`,
        ["A difference", "A similarity", "A cause", "A setting"],
        "A difference",
        "Different sounds = contrast.",
        grade,
        2,
      ),
    );
  }
  return problems;
}

function verbTense(grade: number, count: number, seed: number) {
  const items = [
    { q: "Yesterday she ___ (walk/walked).", a: "walked", c: ["walked", "walk", "walking", "walks"] },
    { q: "Right now they ___ (run/are running).", a: "are running", c: ["are running", "ran", "runs", "run"] },
    { q: "Tomorrow I ___ (will go/go).", a: "will go", c: ["will go", "went", "going", "goes"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(mc(item.q, item.c, item.a, "Match tense to time.", grade, 2));
  }
  return problems;
}

function pronouns(grade: number, count: number, seed: number) {
  const items = [
    { q: "___ went to the store. (I/me)", a: "I", c: ["I", "me", "myself", "mine"] },
    { q: "The teacher called on ___ . (she/her)", a: "her", c: ["her", "she", "hers", "herself"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(mc(item.q, item.c, item.a, "Subject vs object pronouns.", grade, 2));
  }
  return problems;
}

function commas(grade: number, count: number, seed: number) {
  const items = [
    { a: "After school, we played.", w: ["After school we played.", "After, school we played.", "After school we, played."] },
    { a: "Red, blue, and green are colors.", w: ["Red blue and green are colors.", "Red, blue and, green are colors.", "Red blue, and green are colors."] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(mc("Best comma use:", [item.a, ...item.w], item.a, "Commas separate phrases/items.", grade, 2));
  }
  return problems;
}

function figurativeLanguage(grade: number, count: number, seed: number) {
  const items = [
    { text: "As fast as a cheetah", type: "Simile", wrong: ["Metaphor", "Personification", "Hyperbole only"] },
    { text: "Time is a thief", type: "Metaphor", wrong: ["Simile", "Literal fact", "Dialogue"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(
      mc(`"${item.text}" is a:`, [item.type, ...item.wrong], item.type, item.type, grade, 2),
    );
  }
  return problems;
}

const PREFIXES = [
  { pre: "un", word: "happy", meaning: "not happy" },
  { pre: "re", word: "write", meaning: "write again" },
  { pre: "dis", word: "agree", meaning: "not agree" },
  { pre: "mis", word: "spell", meaning: "spell wrong" },
];

function prefixesSuffixes(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = PREFIXES[i % PREFIXES.length];
    problems.push(
      mc(
        `Prefix "${item.pre}-" in "${item.pre}${item.word}" means:`,
        [item.meaning, "very", "before time", "two times"],
        item.meaning,
        `${item.pre}${item.word}: ${item.meaning}.`,
        grade,
        2,
      ),
    );
  }
  return problems;
}

function complexSentences(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Combine: "It rained." + "We stayed inside." Use "because".`,
          correctAnswer: "We stayed inside because it rained.",
          acceptableAnswersJson: ["Because it rained, we stayed inside."],
          explanation: "Complex sentence links two ideas.",
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function pointOfView(grade: number, count: number, seed: number) {
  const items = [
    { s: "I opened my locker.", p: "First person", w: ["Third person", "Second person", "No narrator"] },
    { s: "She opened her locker.", p: "Third person", w: ["First person", "Second person", "No narrator"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(
      mc(`POV of "${item.s}":`, [item.p, ...item.w], item.p, item.p, grade, 2),
    );
  }
  return problems;
}

function textStructure(grade: number, count: number, seed: number) {
  const items = [
    { desc: "Problem: litter. Solution: recycle bins.", s: "Problem-Solution", w: ["Chronology", "Compare", "Description only"] },
    { desc: "First..., Next..., Then..., Finally...", s: "Chronological", w: ["Problem-Solution", "Cause-Effect only", "Debate"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(
      mc(`Structure: ${item.desc}`, [item.s, ...item.w], item.s, item.s, grade, 2),
    );
  }
  return problems;
}

function editingRevising(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Improve: "The thing was good." Replace vague word "thing".`,
          correctAnswer: "The experiment was good.",
          acceptableAnswersJson: ["the project was good", "the book was good", "the movie was good"],
          explanation: "Use precise nouns.",
          difficulty: 3,
        },
        grade,
      ),
    );
  }
  return problems;
}

function authorsCraft(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `"The wind whispered through the trees" uses:`,
        ["Personification", "A math formula", "A bibliography", "A table of contents"],
        "Personification",
        "Wind given human action = personification.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function parallelStructure(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Parallel: "She likes running, swimming, and to bike." Fix:`,
        ["She likes running, swimming, and biking.", "She likes to run, swimming, and bike.", "No change", "She liking run swim bike."],
        "She likes running, swimming, and biking.",
        "Match verb forms.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function activePassive(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      problems.push(
        mc(
          `"The ball was thrown by Mia." Voice:`,
          ["Passive", "Active", "Future", "Conditional"],
          "Passive",
          "Subject receives action.",
          grade,
          3,
        ),
      );
    } else {
      problems.push(
        mc(
          `"Mia threw the ball." Voice:`,
          ["Active", "Passive", "Future", "Conditional"],
          "Active",
          "Subject performs action.",
          grade,
          3,
        ),
      );
    }
  }
  return problems;
}

function researchSkills(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Most credible source for dinosaur facts:`,
        ["Peer-reviewed science article", "Random comment", "Unverified meme", "Anonymous post"],
        "Peer-reviewed science article",
        "Expert-reviewed sources are most credible.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function connotation(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Which feels more negative?`,
        ["sloppy", "casual", "relaxed", "informal"],
        "sloppy",
        "Sloppy suggests carelessness.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function counterarguments(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Claim: "Homework helps learning." Counterargument:`,
        ["Some students need rest and family time too.", "Homework is spelled correctly.", "School has walls.", "Teachers exist."],
        "Some students need rest and family time too.",
        "Counterargument presents opposing view.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function thesisStatements(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Best thesis:`,
        ["School gardens teach science and responsibility.", "Gardens are green.", "I like plants.", "Soil has dirt."],
        "School gardens teach science and responsibility.",
        "Clear, arguable claim.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function rhetoricalDevices(grade: number, count: number, seed: number) {
  const items = [
    { q: "Expert quote builds:", a: "Ethos", w: ["Only humor", "Random noise", "A recipe"] },
    { q: "Story about one family builds:", a: "Pathos", w: ["Ethos only", "Page numbers", "Margins"] },
    { q: "Statistics build:", a: "Logos", w: ["Pathos only", "Fonts", "Colors"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(mc(item.q, [item.a, ...item.w], item.a, item.a, grade, 3));
  }
  return problems;
}

function synthesis(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Synthesis means:`,
        ["Combine ideas from multiple sources", "Copy one sentence", "Ignore sources", "Delete evidence"],
        "Combine ideas from multiple sources",
        "Synthesis weaves sources together.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

function formalWriting(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(
      mc(
        `Most formal sentence:`,
        ["The data indicate a significant trend.", "Stuff got bigger lol.", "Things happened.", "It was kinda cool."],
        "The data indicate a significant trend.",
        "Academic tone avoids slang.",
        grade,
        3,
      ),
    );
  }
  return problems;
}

export const ENGLISH_EXTENDED_BUILDERS: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Synonyms & Antonyms": synonymsAntonyms,
  "Subjects & Predicates": subjectsPredicates,
  Capitalization: capitalization,
  "Spelling Patterns": spellingPatterns,
  "Author's Purpose": authorsPurpose,
  Sequence: sequence,
  "Cause and Effect": causeEffect,
  "Compare and Contrast": compareContrast,
  "Verb Tense": verbTense,
  Pronouns: pronouns,
  Commas: commas,
  "Figurative Language": figurativeLanguage,
  "Prefixes & Suffixes": prefixesSuffixes,
  "Complex Sentences": complexSentences,
  "Point of View": pointOfView,
  "Text Structure": textStructure,
  "Editing & Revising": editingRevising,
  "Author's Craft": authorsCraft,
  "Parallel Structure": parallelStructure,
  "Active vs Passive Voice": activePassive,
  "Research Skills": researchSkills,
  "Connotation & Denotation": connotation,
  Counterarguments: counterarguments,
  "Thesis Statements": thesisStatements,
  "Rhetorical Devices": rhetoricalDevices,
  Synthesis: synthesis,
  "Formal Writing": formalWriting,
};
