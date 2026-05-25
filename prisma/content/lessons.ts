const MATH_LESSONS: Record<string, { method: string; example: string; mistakes: string[] }> = {
  "Multiplication Facts": {
    method: "Use known facts and patterns. Try breaking apart: 7×8 = 7×4×2.",
    example: "6 × 7 = 42 because 6 × 5 = 30 and 6 × 2 = 12, so 30 + 12 = 42.",
    mistakes: ["Guessing without facts", "Adding instead of multiplying"],
  },
  "Division Facts": {
    method: "Think: what times the divisor equals the dividend?",
    example: "56 ÷ 7 = 8 because 7 × 8 = 56.",
    mistakes: ["Subtracting repeatedly without tracking", "Mixing up divisor and quotient"],
  },
  "Place Value": {
    method: "Each digit's value depends on its position. Read left to right: thousands, hundreds, tens, ones.",
    example: "In 4,582 the 5 is in the hundreds place → 500.",
    mistakes: ["Reading digits without place value", "Confusing 40 vs 400"],
  },
  "Long Division": {
    method: "Divide, Multiply, Subtract, Bring down (DMSB). Estimate first.",
    example: "84 ÷ 4: 4 goes into 8 twice, bring down 4 → 21.",
    mistakes: ["Wrong subtraction step", "Forgetting remainder meaning"],
  },
  "Fraction Operations": {
    method: "Multiply numerators and denominators; simplify at the end.",
    example: "2/3 × 1/4 = 2/12 = 1/6.",
    mistakes: ["Adding denominators when multiplying", "Not simplifying"],
  },
  "Ratios": {
    method: "Write as a:b and simplify like a fraction using GCF.",
    example: "8 to 12 → divide both by 4 → 2:3.",
    mistakes: ["Reversing order", "Not simplifying"],
  },
  "Multi-Step Equations": {
    method: "Undo operations in reverse order — opposite of PEMDAS.",
    example: "3x + 5 = 20 → 3x = 15 → x = 5.",
    mistakes: ["Doing operations to one side only", "Sign errors"],
  },
};

const ENGLISH_LESSONS: Record<string, { method: string; example: string; mistakes: string[] }> = {
  "Main Idea": {
    method: "Ask: What is the whole passage mostly about? Not just one detail.",
    example: "A passage about bees pollinating crops → main idea is bees help plants reproduce.",
    mistakes: ["Choosing a tiny detail", "Choosing something too broad"],
  },
  "Inference": {
    method: "Combine text clues + what you already know. Don't invent facts.",
    example: "Muddy shoes + wet umbrella → it probably rained.",
    mistakes: ["Stating something not supported", "Repeating the obvious"],
  },
  "Theme": {
    method: "Theme is the lesson about life — often one sentence.",
    example: "A story about sharing → theme: generosity strengthens friendships.",
    mistakes: ["Confusing theme with plot summary", "Naming one event only"],
  },
  "Argument Structure": {
    method: "Claim = opinion; Reasons = why; Evidence = facts/quotes that prove it.",
    example: "Claim: School gardens help learning. Evidence: students measured plant growth.",
    mistakes: ["Listing evidence without linking to claim", "Evidence that is just opinion"],
  },
  "Essay Structure": {
    method: "Intro (hook + thesis) → Body (topic sentence + evidence + explain) → Conclusion (restate + insight).",
    example: "Thesis: Recycling reduces waste. Body: one reason per paragraph with data.",
    mistakes: ["New arguments in conclusion", "Body paragraphs without topic sentences"],
  },
};

export function lessonContent(subjectSlug: string, skillTitle: string, grade: number) {
  const bank = subjectSlug === "math" ? MATH_LESSONS : ENGLISH_LESSONS;
  const specific = bank[skillTitle];

  const method =
    specific?.method ??
    (subjectSlug === "math"
      ? "Read carefully, show work on the scratchpad, and check reasonableness."
      : "Read the full passage or sentence before answering. Cite text when asked.");

  const example =
    specific?.example ??
    (subjectSlug === "math"
      ? "Example: underline what the question asks, then solve step by step."
      : "Example: highlight the sentence that proves your answer.");

  const mistakes = specific?.mistakes ?? [
    "Rushing without rereading",
    "Not showing work or evidence",
    "Skipping the final check",
  ];

  return {
    title: `${skillTitle} — Grade ${grade}`,
    content: `**${skillTitle}**\n\n${method}\n\nMastery means accuracy AND steady speed. Take your time early, then build fluency.`,
    workedExamples: [{ problem: `Grade ${grade} ${skillTitle}`, solution: example }],
    commonMistakes: mistakes,
    whyItMatters: `${skillTitle} builds toward grade ${grade + 1} ${subjectSlug === "math" ? "math" : "reading and writing"} and appears on standardized assessments.`,
  };
}
