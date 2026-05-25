import type { ProblemType } from "@/generated/prisma/client";

export type GeneratedProblem = {
  type: ProblemType;
  prompt: string;
  choicesJson?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
  gradeLevel: number;
  requiresScratchpad: boolean;
  mistakeCategoriesJson: string[];
};

function mulProblems(grade: number, count: number): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 12) + 1;
    const b = Math.floor(Math.random() * 12) + 1;
    problems.push({
      type: "NUMERIC",
      prompt: `What is ${a} × ${b}?`,
      correctAnswer: String(a * b),
      explanation: `${a} × ${b} = ${a * b}. Think of it as ${a} groups of ${b}.`,
      difficulty: 1 + Math.floor((a + b) / 8),
      gradeLevel: grade,
      requiresScratchpad: true,
      mistakeCategoriesJson: ["fact_error", "calculation_error"],
    });
  }
  return problems;
}

function divProblems(grade: number, count: number): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const b = Math.floor(Math.random() * 11) + 2;
    const quotient = Math.floor(Math.random() * 11) + 1;
    const a = b * quotient;
    problems.push({
      type: "NUMERIC",
      prompt: `What is ${a} ÷ ${b}?`,
      correctAnswer: String(quotient),
      explanation: `${a} ÷ ${b} = ${quotient} because ${b} × ${quotient} = ${a}.`,
      difficulty: 2,
      gradeLevel: grade,
      requiresScratchpad: true,
      mistakeCategoriesJson: ["fact_error", "inverse_error"],
    });
  }
  return problems;
}

function fractionProblems(grade: number, count: number): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  const fracs = [
    ["1/2", "2/4"],
    ["1/3", "2/6"],
    ["2/3", "4/6"],
    ["1/4", "2/8"],
    ["3/4", "6/8"],
  ];
  for (let i = 0; i < count; i++) {
    const [a, b] = fracs[i % fracs.length];
    problems.push({
      type: "MULTIPLE_CHOICE",
      prompt: `Which fraction is equivalent to ${a}?`,
      choicesJson: [b, "1/5", "3/7", "2/3"],
      correctAnswer: b,
      explanation: `${a} = ${b}. Multiply numerator and denominator by the same number.`,
      difficulty: 2,
      gradeLevel: grade,
      requiresScratchpad: true,
      mistakeCategoriesJson: ["equivalent_error"],
    });
  }
  return problems;
}

function ratioProblems(grade: number, count: number): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 5) + 2;
    const b = Math.floor(Math.random() * 5) + 2;
    problems.push({
      type: "SHORT_ANSWER",
      prompt: `Write the ratio of ${a} to ${b} in simplest form (use a:b).`,
      correctAnswer: `${a}:${b}`,
      explanation: `The ratio of ${a} to ${b} is ${a}:${b}.`,
      difficulty: 2,
      gradeLevel: grade,
      requiresScratchpad: true,
      mistakeCategoriesJson: ["ratio_error"],
    });
  }
  return problems;
}

function equationProblems(grade: number, count: number): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 10) + 1;
    const a = Math.floor(Math.random() * 5) + 2;
    const b = a * x;
    problems.push({
      type: "NUMERIC",
      prompt: `Solve for x: ${a}x = ${b}`,
      correctAnswer: String(x),
      explanation: `Divide both sides by ${a}: x = ${b} ÷ ${a} = ${x}.`,
      difficulty: 3,
      gradeLevel: grade,
      requiresScratchpad: true,
      mistakeCategoriesJson: ["algebra_error", "inverse_error"],
    });
  }
  return problems;
}

function genericMathProblems(
  skillTitle: string,
  grade: number,
  count: number,
): GeneratedProblem[] {
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 50) + 10;
    const b = Math.floor(Math.random() * 30) + 5;
    problems.push({
      type: "NUMERIC",
      prompt: `[${skillTitle}] Problem ${i + 1}: Calculate ${a} + ${b}.`,
      correctAnswer: String(a + b),
      explanation: `${a} + ${b} = ${a + b}.`,
      difficulty: 1 + (i % 3),
      gradeLevel: grade,
      requiresScratchpad: true,
      mistakeCategoriesJson: ["calculation_error"],
    });
  }
  return problems;
}

function englishMC(skillTitle: string, grade: number, count: number): GeneratedProblem[] {
  const templates = [
    {
      prompt: `Read: "The sun warmed the quiet meadow." What is the main idea?`,
      choices: ["A meadow scene on a sunny day", "The sun is hot", "Meadows are quiet", "Warm weather is nice"],
      answer: "A meadow scene on a sunny day",
      explanation: "The sentence describes a sunny meadow setting.",
    },
    {
      prompt: `Which sentence is written correctly?`,
      choices: ["She dont like apples.", "She doesn't like apples.", "She doesnt like apples.", "She don't likes apples."],
      answer: "She doesn't like apples.",
      explanation: "Use doesn't + base verb for third person singular negative.",
    },
    {
      prompt: `What does "abundant" most likely mean in: "The garden had abundant flowers"?`,
      choices: ["Very few", "Plentiful", "Ugly", "Hidden"],
      answer: "Plentiful",
      explanation: "Abundant means having plenty of something.",
    },
    {
      prompt: `Which is the best topic sentence for a paragraph about dogs?`,
      choices: ["Dogs are popular pets for many reasons.", "I ate lunch today.", "Cats are also pets.", "The sky is blue."],
      answer: "Dogs are popular pets for many reasons.",
      explanation: "A topic sentence introduces the main idea of the paragraph.",
    },
    {
      prompt: `Which word is a verb?`,
      choices: ["Quickly", "Running", "Beautiful", "Table"],
      answer: "Running",
      explanation: "Running shows action; it can function as a verb.",
    },
  ];

  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length];
    problems.push({
      type: "MULTIPLE_CHOICE",
      prompt: `[${skillTitle}] ${t.prompt}`,
      choicesJson: t.choices,
      correctAnswer: t.answer,
      explanation: t.explanation,
      difficulty: 1 + (i % 3),
      gradeLevel: grade,
      requiresScratchpad: false,
      mistakeCategoriesJson: ["comprehension_error", "grammar_error"],
    });
  }
  return problems;
}

function englishShortAnswer(skillTitle: string, grade: number, count: number): GeneratedProblem[] {
  const prompts = [
    { q: "Write one sentence using a comma correctly.", a: "After school, I play outside." },
    { q: "Name one supporting detail for the main idea: 'Exercise is healthy.'", a: "It strengthens your heart." },
    { q: "What is the theme of a story about honesty?", a: "Honesty is important." },
    { q: "Write a claim about why reading is useful.", a: "Reading helps you learn new things." },
  ];
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i++) {
    const p = prompts[i % prompts.length];
    problems.push({
      type: "SHORT_ANSWER",
      prompt: `[${skillTitle}] ${p.q}`,
      correctAnswer: p.a.toLowerCase(),
      explanation: "Accept reasonable answers that demonstrate understanding.",
      difficulty: 2 + (i % 2),
      gradeLevel: grade,
      requiresScratchpad: false,
      mistakeCategoriesJson: ["writing_error"],
    });
  }
  return problems;
}

export function generateProblemsForSkill(
  subjectSlug: string,
  skillTitle: string,
  grade: number,
  count = 15,
): GeneratedProblem[] {
  const lower = skillTitle.toLowerCase();

  if (subjectSlug === "math") {
    if (lower.includes("multiplication fact")) return mulProblems(grade, count);
    if (lower.includes("division fact")) return divProblems(grade, count);
    if (lower.includes("fraction") || lower.includes("equivalent"))
      return fractionProblems(grade, count);
    if (lower.includes("ratio")) return ratioProblems(grade, count);
    if (lower.includes("equation") || lower.includes("expression"))
      return equationProblems(grade, count);
    return genericMathProblems(skillTitle, grade, count);
  }

  if (lower.includes("writing") || lower.includes("response") || lower.includes("essay")) {
    return englishShortAnswer(skillTitle, grade, count);
  }
  return englishMC(skillTitle, grade, count);
}

export function lessonContent(subjectSlug: string, skillTitle: string, grade: number) {
  return {
    title: `${skillTitle} — Grade ${grade}`,
    content:
      subjectSlug === "math"
        ? `In this lesson, you'll build fluency with **${skillTitle}**. Mastery means solving problems quickly AND accurately. Use the scratchpad to show your work — this helps you think through each step.\n\n**Method:** Read carefully, plan your approach, solve step by step, then check your answer.`
        : `In this lesson, you'll strengthen **${skillTitle}**. Read each passage carefully and look for clues in the text. For grammar, think about the rule before choosing an answer.\n\n**Strategy:** Read → Think → Answer → Check.`,
    workedExamples: [
      {
        problem: subjectSlug === "math" ? "Example: 7 × 8 = ?" : "Example: Find the main idea.",
        solution:
          subjectSlug === "math"
            ? "Think: 7 × 8 = 56. You can also use 7 × 8 = (7 × 4) × 2 = 28 × 2 = 56."
            : "Read the whole paragraph. Ask: What is this mostly about? Pick the answer that covers the whole passage, not just one detail.",
      },
    ],
    commonMistakes: [
      "Rushing without reading the full question",
      "Skipping steps in your work",
      "Not checking your answer",
    ],
    whyItMatters: `${skillTitle} is a building block for more advanced ${subjectSlug === "math" ? "math" : "reading and writing"} skills.`,
  };
}
