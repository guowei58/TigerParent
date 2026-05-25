import type { ContentProblem } from "./types";
import { createRng, randInt, pick } from "./rng";
import { passagesForGrade, type Passage } from "./passages";
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
  correct: string,
  wrongInputs: McqChoiceInput[],
  explanation: string,
  grade: number,
  difficulty: number,
  seed: number,
): ContentProblem {
  const built = buildMcqChoices(
    [{ text: correct, isCorrect: true, rationale: explanation }, ...wrongInputs],
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

function wrongChoice(
  text: string,
  rationale: string,
  misconception?: string,
): McqChoiceInput {
  return { text, isCorrect: false, rationale, misconception };
}

function distractorsFromPool(
  correct: string,
  pool: string[],
  rationaleFor: (text: string) => string,
  count = 3,
): McqChoiceInput[] {
  const out: McqChoiceInput[] = [];
  for (const text of pool) {
    if (text === correct) continue;
    out.push(wrongChoice(text, rationaleFor(text), "comprehension_error"));
    if (out.length >= count) break;
  }
  return out;
}

function passageBlock(passage: Passage) {
  return `Read the passage:\n\n"${passage.title}"\n${passage.text}\n\n`;
}

function mcList(
  prompt: string,
  correct: string,
  wrongTexts: string[],
  explanation: string,
  grade: number,
  difficulty: number,
  seed: number,
  wrongRationale?: (text: string) => string,
): ContentProblem {
  const rationale =
    wrongRationale ??
    ((text: string) =>
      `"${text}" is tempting but does not fit the passage or rule as well as the correct answer.`);
  return mc(
    prompt,
    correct,
    wrongTexts
      .filter((t) => t?.trim() && t !== correct)
      .slice(0, 3)
      .map((text) => wrongChoice(text, rationale(text), "comprehension_error")),
    explanation,
    grade,
    difficulty,
    seed,
  );
}

function mcFromChoices(
  prompt: string,
  choices: string[],
  correct: string,
  explanation: string,
  grade: number,
  difficulty: number,
  seed: number,
): ContentProblem {
  return mcList(
    prompt,
    correct,
    choices.filter((c) => c !== correct),
    explanation,
    grade,
    difficulty,
    seed,
    (text) => `"${text}" is a common grammar or usage mistake.`,
  );
}

function buildFromPassages(
  grade: number,
  count: number,
  seed: number,
  fn: (passage: Passage, i: number, rng: () => number, itemSeed: number) => ContentProblem,
) {
  const rng = createRng(seed);
  const bank = passagesForGrade(grade);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const passage = bank[i % bank.length] ?? passagesForGrade(3)[0];
    problems.push(fn(passage, i, rng, seed + i * 17));
  }
  return problems;
}

function g3MainIdea(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, _rng, itemSeed) =>
    mcList(
      `${passageBlock(passage)}What is the main idea?`,
      passage.mainIdea,
      [
        passage.supportingDetails[0] ?? "A small detail from the story",
        passage.title,
        passage.supportingDetails[1] ?? passage.summary,
      ],
      `The main idea covers the whole passage: ${passage.mainIdea}`,
      grade,
      2,
      itemSeed,
      (text) =>
        `"${text}" is related to the passage but is a detail or title, not the full main idea.`,
    ),
  );
}

function g3SupportingDetails(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, i, _rng, itemSeed) => {
    const detail = passage.supportingDetails[i % passage.supportingDetails.length];
    return mcList(
      `${passageBlock(passage)}Which detail supports the main idea?`,
      detail,
      [passage.mainIdea, passage.title, passage.summary],
      `This detail directly supports the main idea with evidence from the text.`,
      grade,
      2,
      itemSeed,
      (text) => `"${text}" states the main idea or summary rather than a supporting detail.`,
    );
  });
}

export function g3Vocabulary(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, i, _rng, itemSeed) => {
    const vocab = passage.vocabulary[i % passage.vocabulary.length];
    const alt = passage.vocabulary[(i + 1) % passage.vocabulary.length];
    return mcList(
      `${passageBlock(passage)}What does "${vocab.word}" most likely mean?`,
      vocab.definition,
      [
        alt?.definition ?? "to move quickly without purpose",
        `the opposite of ${vocab.word}`,
        "a detail about the setting only",
      ],
      `Context clue: ${vocab.hint}.`,
      grade,
      2,
      itemSeed,
      (text) => `"${text}" does not match how "${vocab.word}" is used in the passage.`,
    );
  });
}

const SENTENCE_FIXES: { broken: string; fixed: string; rule: string }[] = [
  { broken: "the dog ran fast", fixed: "The dog ran fast.", rule: "Start with a capital letter and end with a period." },
  { broken: "Because it rained", fixed: "Because it rained, we stayed inside.", rule: "A dependent clause needs a complete sentence." },
  { broken: "Me and Sam went home", fixed: "Sam and I went home.", rule: "Use subject pronouns: Sam and I." },
  { broken: "She dont like spinach", fixed: "She doesn't like spinach.", rule: "Use doesn't for third-person singular." },
  { broken: "Running through the park", fixed: "I was running through the park.", rule: "A fragment needs a subject and verb." },
];

function g3SentenceStructure(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = SENTENCE_FIXES[i % SENTENCE_FIXES.length];
    if (i % 2 === 0) {
      problems.push(
        mcList(
          `Which is a complete sentence?`,
          item.fixed,
          [item.broken, "Under the big tree.", "When the bell rings."],
          item.rule,
          grade,
          2,
          seed + i,
          (text) => `"${text}" is a fragment or incomplete sentence.`,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `Fix this sentence: "${item.broken}"`,
            correctAnswer: item.fixed,
            acceptableAnswersJson: [item.fixed.replace(".", ""), item.fixed.toLowerCase()],
            explanation: item.rule,
            difficulty: 3,
            mistakeCategoriesJson: ["grammar_error"],
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

const PUNCTUATION_ITEMS: { prompt: string; answer: string; explanation: string }[] = [
  { prompt: "Add commas: After school we walked to the library.", answer: "After school, we walked to the library.", explanation: "Use a comma after an introductory phrase." },
  { prompt: "Which sentence is punctuated correctly?", answer: "Where is my notebook?", explanation: "Questions end with a question mark." },
  { prompt: "Fix: Its time to go home.", answer: "It's time to go home.", explanation: "It's = it is; its shows possession." },
  { prompt: "Add apostrophe: The girls coats were wet.", answer: "The girls' coats were wet.", explanation: "Plural possessive: girls'." },
  { prompt: "Which uses a comma in a list correctly?", answer: "We packed apples, sandwiches, and water.", explanation: "Use commas to separate items in a series." },
];

function g3Punctuation(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = PUNCTUATION_ITEMS[i % PUNCTUATION_ITEMS.length];
    if (i % 3 === 0) {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: item.prompt,
            correctAnswer: item.answer,
            acceptableAnswersJson: [item.answer.toLowerCase()],
            explanation: item.explanation,
            difficulty: 2,
            mistakeCategoriesJson: ["punctuation_error"],
          },
          grade,
        ),
      );
    } else {
      problems.push(
        mcList(
          `Choose the correctly punctuated sentence:`,
          item.answer,
          ["We packed apples sandwiches and water.", "Where is my notebook", "Its time to go home."],
          item.explanation,
          grade,
          2,
          seed + i,
          (text) => `"${text}" has a punctuation or apostrophe error.`,
        ),
      );
    }
  }
  return problems;
}

function g4ReadingComprehension(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, i, _rng, itemSeed) => {
    const questions = [
      {
        q: "What genre is this passage?",
        a: passage.genre === "fiction" ? "Fiction" : "Nonfiction",
        wrong: ["Poetry", "Drama", passage.genre === "fiction" ? "Nonfiction" : "Fiction"],
      },
      {
        q: "What is this passage mostly about?",
        a: passage.mainIdea,
        wrong: [...passage.supportingDetails, passage.title].filter(Boolean),
      },
      {
        q: "Which best summarizes the passage?",
        a: passage.summary,
        wrong: [passage.mainIdea, passage.supportingDetails[0] ?? passage.title],
      },
    ];
    const item = questions[i % questions.length];
    return mcList(
      `${passageBlock(passage)}${item.q}`,
      item.a,
      item.wrong,
      `Use evidence from the passage to confirm: ${item.a}`,
      grade,
      2,
      itemSeed,
    );
  });
}

export function g4Inference(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, _rng, itemSeed) => {
    const inference =
      passage.theme ??
      (passage.genre === "fiction"
        ? "The character learns something from the experience."
        : "The author wants readers to understand an important real-world issue.");
    return mcList(
      `${passageBlock(passage)}Which can you infer from the passage?`,
      inference,
      [
        passage.mainIdea,
        passage.summary,
        passage.supportingDetails[0] ?? passage.title,
      ],
      `"${passage.mainIdea}" is stated directly. An inference goes beyond what is directly stated but is still supported by clues.`,
      grade,
      3,
      itemSeed,
      (text) => `"${text}" is stated directly in the text rather than inferred.`,
    );
  });
}

function g4ParagraphStructure(grade: number, count: number, seed: number) {
  const rng = createRng(seed);
  const problems: ContentProblem[] = [];
  const paragraphs = [
    {
      topic: "Dogs make loyal pets.",
      detail: "They greet their owners happily after school.",
      transition: "For example",
    },
    {
      topic: "Recycling reduces waste.",
      detail: "Reusing materials keeps trash out of landfills.",
      transition: "In addition",
    },
  ];
  for (let i = 0; i < count; i++) {
    const para = paragraphs[i % paragraphs.length];
    if (i % 2 === 0) {
      problems.push(
        mcList(
          `Which sentence is the topic sentence?\n1) ${para.detail}\n2) ${para.topic}\n3) ${para.transition}, ${para.detail}`,
          para.topic,
          [para.detail, `${para.transition}, ${para.detail}`, "They greet their owners happily."],
          "The topic sentence states the main point of the paragraph.",
          grade,
          2,
          seed + i,
          (text) => `"${text}" is a detail or example, not the paragraph's main point.`,
        ),
      );
    } else {
      problems.push(
        p(
          {
            type: "SHORT_ANSWER",
            prompt: `What transition word could introduce this detail: "${para.detail}"?`,
            correctAnswer: para.transition,
            acceptableAnswersJson: [para.transition.toLowerCase(), "for example", "in addition"],
            explanation: "Transition words connect ideas smoothly.",
            difficulty: 2,
          },
          grade,
        ),
      );
    }
  }
  return problems;
}

const GRAMMAR_ITEMS: { q: string; choices: string[]; a: string; exp: string }[] = [
  { q: "Choose the correct verb: The team (is/are) ready.", choices: ["is", "are", "were", "be"], a: "is", exp: "Team is a collective noun treated as singular here." },
  { q: "Choose the correct form: She (run/runs) every morning.", choices: ["runs", "run", "running", "runned"], a: "runs", exp: "Third-person singular adds -s." },
  { q: "Which is correct?", choices: ["They’re going to the park.", "Their going to the park.", "There going to the park.", "Theyre going to the park."], a: "They’re going to the park.", exp: "They’re = they are." },
  { q: "Pick the adjective:", choices: ["quick", "quickly", "run", "happily"], a: "quick", exp: "Adjectives describe nouns." },
  { q: "Pick the adverb:", choices: ["silently", "silent", "silence", "silenced"], a: "silently", exp: "Adverbs describe verbs." },
];

function g4Grammar(grade: number, count: number, seed: number) {
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = GRAMMAR_ITEMS[i % GRAMMAR_ITEMS.length];
    problems.push(mcFromChoices(item.q, item.choices, item.a, item.exp, grade, 2, seed + i));
  }
  return problems;
}

function g4EvidenceFromText(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, i, _rng, itemSeed) => {
    const quote = passage.supportingDetails[i % passage.supportingDetails.length];
    return mcList(
      `${passageBlock(passage)}Which sentence from the passage best supports: "${passage.mainIdea}"?`,
      quote,
      [passage.title, passage.mainIdea, passage.summary],
      "Strong evidence is a detail directly stated in the text.",
      grade,
      3,
      itemSeed,
      (text) => `"${text}" is the title or main idea, not specific supporting evidence.`,
    );
  });
}

function g5Theme(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, _rng, itemSeed) => {
    const theme = passage.theme ?? "Hard work leads to growth.";
    return mcList(
      `${passageBlock(passage)}What is a theme of this passage?`,
      theme,
      [passage.mainIdea, passage.title, passage.summary],
      "Theme is the lesson or message — broader than the main idea.",
      grade,
      3,
      itemSeed,
      (text) => `"${text}" describes what happens, not the deeper lesson.`,
    );
  });
}

function g5Summarizing(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, _rng, itemSeed) =>
    mcList(
      `${passageBlock(passage)}Which is the best summary?`,
      passage.summary,
      [passage.supportingDetails[0] ?? passage.title, passage.mainIdea, passage.title],
      "A summary is short and covers the whole passage without extra details.",
      grade,
      2,
      itemSeed,
      (text) => `"${text}" is too narrow or only part of the passage.`,
    ),
  );
}

export function g5Vocabulary(grade: number, count: number, seed: number) {
  return g3Vocabulary(grade, count, seed + 100);
}

function g5GrammarUsage(grade: number, count: number, seed: number) {
  const items = [
    { q: "Choose past tense: Yesterday I (go/went) to the store.", a: "went", choices: ["went", "go", "goes", "going"] },
    { q: "Choose correct: Neither the cats nor the dog (is/are) outside.", a: "is", choices: ["is", "are", "were", "be"] },
    { q: "Which sentence has correct subject-verb agreement?", a: "The books on the shelf are dusty.", choices: ["The books on the shelf are dusty.", "The books on the shelf is dusty.", "The books on the shelf was dusty.", "The books on the shelf be dusty."] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(mcFromChoices(item.q, item.choices, item.a, "Check tense and agreement with the subject.", grade, 2, seed + i));
  }
  return problems;
}

function g5ShortWrittenResponses(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, i) =>
    p(
      {
        type: "SHORT_ANSWER",
        prompt: `${passageBlock(passage)}In one sentence, explain why "${passage.supportingDetails[0]}" matters to the main idea.`,
        correctAnswer: `It supports the main idea because it gives evidence about ${passage.mainIdea.toLowerCase()}.`,
        acceptableAnswersJson: [
          passage.supportingDetails[0],
          `It shows ${passage.mainIdea.toLowerCase()}`,
          passage.mainIdea,
        ],
        explanation: "A strong response connects the detail to the main idea.",
        difficulty: 3,
        mistakeCategoriesJson: ["writing_error"],
      },
      grade,
    ),
  );
}

export function g6Inference(grade: number, count: number, seed: number) {
  return g4Inference(grade, count, seed + 200);
}

function g6ArgumentStructure(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, i, _rng, itemSeed) => {
    const claim = passage.claim ?? passage.mainIdea;
    const evidence = passage.evidence?.[0] ?? passage.supportingDetails[0];
    const problems = [
      mcList(
        `${passageBlock(passage)}What is the author's claim?`,
        claim,
        [evidence, passage.title, passage.summary],
        "The claim is the main argument the author wants you to believe.",
        grade,
        3,
        itemSeed,
        (text) => `"${text}" is evidence or context, not the claim itself.`,
      ),
      mcList(
        `${passageBlock(passage)}Which detail best serves as evidence for the claim?`,
        evidence,
        [claim, passage.title, passage.mainIdea],
        "Evidence is a fact or detail that supports the claim.",
        grade,
        3,
        itemSeed + 1,
        (text) => `"${text}" states the claim or topic rather than supporting evidence.`,
      ),
    ];
    return problems[i % problems.length];
  });
}

function g6TextEvidence(grade: number, count: number, seed: number) {
  return g4EvidenceFromText(grade, count, seed + 300);
}

function g6SentenceCorrection(grade: number, count: number, seed: number) {
  const items = [
    { broken: "Each of the students have a planner.", fixed: "Each of the students has a planner." },
    { broken: "The data show a clear trend.", fixed: "The data shows a clear trend." },
    { broken: "Him and me finished the lab.", fixed: "He and I finished the lab." },
    { broken: "We should of studied more.", fixed: "We should have studied more." },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: `Correct this sentence: "${item.broken}"`,
          correctAnswer: item.fixed,
          acceptableAnswersJson: [item.fixed.toLowerCase()],
          explanation: "Fix agreement, pronoun case, or word choice.",
          difficulty: 3,
          mistakeCategoriesJson: ["grammar_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g6ParagraphWriting(grade: number, count: number, seed: number) {
  const prompts = [
    { q: "Write a topic sentence about why reading daily helps students.", a: "Reading daily builds vocabulary and improves comprehension." },
    { q: "Write a concluding sentence for a paragraph about recycling.", a: "Therefore, small recycling habits make a big environmental difference." },
    { q: "Write one sentence using the transition 'However' correctly.", a: "However, the experiment failed on the first try." },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = prompts[i % prompts.length];
    problems.push(
      p(
        {
          type: "SHORT_ANSWER",
          prompt: item.q,
          correctAnswer: item.a,
          acceptableAnswersJson: [item.a.toLowerCase(), "however,"],
          explanation: "Strong paragraphs have clear topic, evidence, and concluding sentences.",
          difficulty: 3,
          mistakeCategoriesJson: ["writing_error"],
        },
        grade,
      ),
    );
  }
  return problems;
}

function g7AnalyticalReading(grade: number, count: number, seed: number) {
  return buildFromPassages(grade, count, seed, (passage, _i, _rng, itemSeed) => {
    const analysis =
      passage.genre === "fiction"
        ? "The author uses the situation to make readers reflect on assumptions."
        : "The author balances benefits and costs to present a nuanced viewpoint.";
    return mcList(
      `${passageBlock(passage)}Which statement best describes the author's approach?`,
      analysis,
      [
        "The author lists facts with no clear purpose.",
        passage.mainIdea,
        passage.summary,
      ],
      "Analysis explains HOW the author develops meaning, not just WHAT happens.",
      grade,
      4,
      itemSeed,
      (text) => `"${text}" describes content but not the author's approach.`,
    );
  });
}

function g7ClaimsAndEvidence(grade: number, count: number, seed: number) {
  return g6ArgumentStructure(grade, count, seed + 400);
}

function g7GrammarPrecision(grade: number, count: number, seed: number) {
  const items = [
    { q: "Choose the precise word: The speaker was (very tired/exhausted) after the debate.", a: "exhausted", choices: ["exhausted", "very tired", "kind of tired", "tired-ish"] },
    { q: "Which sentence is most formal?", a: "The results indicate a significant increase.", choices: ["The results indicate a significant increase.", "The results show stuff got bigger.", "Things went up a lot.", "It kinda increased."] },
    { q: "Fix the vague pronoun: When Maria met Lila, she smiled.", a: "When Maria met Lila, Maria smiled.", choices: ["When Maria met Lila, Maria smiled.", "When Maria met Lila, she smiled.", "When Maria met Lila, they smiled.", "Maria met Lila smiling."] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(mcFromChoices(item.q, item.choices, item.a, "Precise language and clear references improve clarity.", grade, 3, seed + i));
  }
  return problems;
}

function g7EssayStructure(grade: number, count: number, seed: number) {
  const items = [
    { q: "Which belongs in an introduction?", a: "A hook and a clear thesis statement", wrong: ["Detailed body evidence", "The final conclusion", "A bibliography only"] },
    { q: "What belongs in a body paragraph?", a: "A topic sentence, evidence, and explanation", wrong: ["Only the title", "A hook", "Works cited entries"] },
    { q: "What belongs in a conclusion?", a: "A restated thesis and final insight", wrong: ["Brand-new unrelated arguments", "The hook repeated exactly", "Only quotes"] },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i % items.length];
    problems.push(
      mcList(item.q, item.a, item.wrong, "Essays move from introduction → body paragraphs → conclusion.", grade, 2, seed + i),
    );
  }
  return problems;
}

function g7VocabularyDevelopment(grade: number, count: number, seed: number) {
  const roots = [
    { root: "struct", meaning: "build", word: "structure", def: "something built or arranged" },
    { root: "port", meaning: "carry", word: "transport", def: "to carry across" },
    { root: "graph", meaning: "write", word: "paragraph", def: "a section of writing" },
    { root: "bio", meaning: "life", word: "biology", def: "the study of life" },
    { root: "therm", meaning: "heat", word: "thermometer", def: "a device measuring temperature" },
  ];
  const problems: ContentProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = roots[i % roots.length];
    problems.push(
      mcList(
        `The root "${item.root}" means "${item.meaning}." Which word uses this root correctly?`,
        item.word,
        ["constructive", "portable", "biography"].filter((w) => w !== item.word),
        `${item.word}: ${item.def}`,
        grade,
        3,
        seed + i,
        (text) => `"${text}" uses a different root or does not match the meaning "${item.meaning}".`,
      ),
    );
  }
  return problems;
}

export const ENGLISH_BUILDERS: Record<
  string,
  (grade: number, count: number, seed: number) => ContentProblem[]
> = {
  "Main Idea": g3MainIdea,
  "Supporting Details": g3SupportingDetails,
  "Sentence Structure": g3SentenceStructure,
  Punctuation: g3Punctuation,
  "Reading Comprehension": g4ReadingComprehension,
  Inference: g6Inference,
  "Paragraph Structure": g4ParagraphStructure,
  Grammar: g4Grammar,
  "Evidence from Text": g4EvidenceFromText,
  Theme: g5Theme,
  Summarizing: g5Summarizing,
  "Grammar Usage": g5GrammarUsage,
  "Short Written Responses": g5ShortWrittenResponses,
  "Argument Structure": g6ArgumentStructure,
  "Text Evidence": g6TextEvidence,
  "Sentence Correction": g6SentenceCorrection,
  "Paragraph Writing": g6ParagraphWriting,
  "Analytical Reading": g7AnalyticalReading,
  "Claims and Evidence": g7ClaimsAndEvidence,
  "Grammar Precision": g7GrammarPrecision,
  "Essay Structure": g7EssayStructure,
  "Vocabulary Development": g7VocabularyDevelopment,
};
