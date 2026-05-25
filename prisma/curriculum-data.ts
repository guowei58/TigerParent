export type SkillDef = {
  title: string;
  description: string;
  prerequisites?: string[];
  targetMedianSeconds?: number;
  minProblems?: number;
  /** Kumon-style fluency drills get extra repetition */
  fluency?: boolean;
};

export type LevelDef = {
  grade: number;
  title: string;
  skills: SkillDef[];
};

export function skillSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function skillKey(subjectSlug: string, grade: number, title: string): string {
  return `${subjectSlug}-g${grade}-${skillSlug(title)}`;
}

export const MATH_CURRICULUM: LevelDef[] = [
  {
    grade: 3,
    title: "Grade 3 Math Foundations",
    skills: [
      { title: "Addition Facts to 10", description: "Instant recall of sums through 10", targetMedianSeconds: 6, minProblems: 80, fluency: true },
      { title: "Addition Facts to 20", description: "Instant recall of sums through 20", targetMedianSeconds: 8, minProblems: 80, fluency: true },
      { title: "Subtraction Facts to 10", description: "Instant recall within 10", targetMedianSeconds: 7, minProblems: 80, fluency: true },
      { title: "Subtraction Facts to 20", description: "Instant recall within 20", targetMedianSeconds: 9, minProblems: 80, fluency: true },
      { title: "Multiplication ×0, ×1, ×2, ×5", description: "Foundation times tables", targetMedianSeconds: 7, minProblems: 100, fluency: true },
      { title: "Multiplication ×3 & ×4", description: "Times tables 3 and 4", targetMedianSeconds: 8, minProblems: 100, fluency: true },
      { title: "Multiplication ×6 & ×7", description: "Times tables 6 and 7", targetMedianSeconds: 8, minProblems: 100, fluency: true },
      { title: "Multiplication ×8 & ×9", description: "Times tables 8 and 9", targetMedianSeconds: 8, minProblems: 100, fluency: true },
      { title: "Multiplication ×10, ×11, ×12", description: "Times tables 10–12", targetMedianSeconds: 8, minProblems: 100, fluency: true },
      { title: "Multiplication Mixed 0–12", description: "Mixed multiplication fluency", targetMedianSeconds: 8, minProblems: 120, fluency: true },
      { title: "Division ÷2–÷5", description: "Division linked to ×2–×5", targetMedianSeconds: 9, minProblems: 100, fluency: true },
      { title: "Division ÷6–÷9", description: "Division linked to ×6–×9", targetMedianSeconds: 10, minProblems: 100, fluency: true },
      { title: "Division ÷10–÷12", description: "Division with larger divisors", targetMedianSeconds: 10, minProblems: 100, fluency: true },
      { title: "Division Mixed", description: "Mixed division fluency", targetMedianSeconds: 10, minProblems: 120, fluency: true },
      { title: "Place Value", description: "Ones through ten-thousands", targetMedianSeconds: 20, minProblems: 60 },
      { title: "Rounding", description: "Nearest 10 and 100", targetMedianSeconds: 20, minProblems: 60 },
      { title: "Multi-Digit Addition", description: "Regrouping with 3–4 digit numbers", targetMedianSeconds: 25, minProblems: 60 },
      { title: "Multi-Digit Subtraction", description: "Borrowing with 3–4 digit numbers", targetMedianSeconds: 25, minProblems: 60 },
      { title: "Basic Fractions", description: "Parts of a whole and number line", targetMedianSeconds: 25, minProblems: 60 },
      { title: "Perimeter", description: "Perimeter of polygons", targetMedianSeconds: 30, minProblems: 50 },
      { title: "Telling Time", description: "Elapsed time and clocks", targetMedianSeconds: 30, minProblems: 50 },
      { title: "Data & Graphs", description: "Bar graphs and pictographs", targetMedianSeconds: 30, minProblems: 50 },
      { title: "One-Step Word Problems", description: "Single-operation stories", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Two-Step Word Problems", description: "Two-operation stories", targetMedianSeconds: 50, minProblems: 60 },
    ],
  },
  {
    grade: 4,
    title: "Grade 4 Math Mastery",
    skills: [
      { title: "Multi-Digit Multiplication 2×1", description: "Two-digit by one-digit", targetMedianSeconds: 30, minProblems: 70 },
      { title: "Multi-Digit Multiplication 2×2", description: "Two-digit by two-digit", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Long Division 1-Digit Divisor", description: "Division without remainders", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Long Division with Remainders", description: "Interpret remainders", targetMedianSeconds: 45, minProblems: 70 },
      { title: "Factors & Multiples", description: "Factor pairs and multiples", targetMedianSeconds: 30, minProblems: 60 },
      { title: "Equivalent Fractions", description: "Generate and identify equivalents", targetMedianSeconds: 30, minProblems: 60 },
      { title: "Compare Fractions", description: "Same denominator and benchmark", targetMedianSeconds: 30, minProblems: 60 },
      { title: "Add Fractions Like Denominators", description: "Addition with same denominator", targetMedianSeconds: 30, minProblems: 60 },
      { title: "Subtract Fractions Like Denominators", description: "Subtraction with same denominator", targetMedianSeconds: 30, minProblems: 60 },
      { title: "Decimal Place Value", description: "Tenths and hundredths", targetMedianSeconds: 25, minProblems: 60 },
      { title: "Compare Decimals", description: "Order decimals to hundredths", targetMedianSeconds: 25, minProblems: 60 },
      { title: "Angles & Lines", description: "Measure and classify angles", targetMedianSeconds: 30, minProblems: 50 },
      { title: "Area of Rectangles", description: "Area using length × width", targetMedianSeconds: 30, minProblems: 50 },
      { title: "Symmetry & Patterns", description: "Lines of symmetry and sequences", targetMedianSeconds: 30, minProblems: 50 },
      { title: "Measurement Conversions", description: "Customary units", targetMedianSeconds: 35, minProblems: 50 },
      { title: "Multi-Step Word Problems", description: "Complex real-world problems", targetMedianSeconds: 60, minProblems: 60 },
    ],
  },
  {
    grade: 5,
    title: "Grade 5 Math Mastery",
    skills: [
      { title: "Multiply Fractions", description: "Fraction × fraction and whole", targetMedianSeconds: 35, minProblems: 70 },
      { title: "Divide Fractions", description: "Unit fractions and whole numbers", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Add Fractions Unlike Denominators", description: "Find common denominators", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Subtract Fractions Unlike Denominators", description: "Borrow with unlike denominators", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Decimal Addition & Subtraction", description: "Align decimal points", targetMedianSeconds: 30, minProblems: 70 },
      { title: "Decimal Multiplication", description: "Multiply decimals", targetMedianSeconds: 35, minProblems: 70 },
      { title: "Decimal Division", description: "Divide by whole numbers", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Volume", description: "Volume of rectangular prisms", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Coordinate Plane", description: "Plot and read ordered pairs", targetMedianSeconds: 30, minProblems: 60 },
      { title: "Order of Operations", description: "PEMDAS with whole numbers", targetMedianSeconds: 35, minProblems: 70 },
      { title: "Numerical Expressions", description: "Write and interpret expressions", targetMedianSeconds: 35, minProblems: 60 },
      { title: "Percent Introduction", description: "Percent of a number", targetMedianSeconds: 35, minProblems: 60 },
      { title: "Convert Measurements", description: "Metric and customary", targetMedianSeconds: 35, minProblems: 50 },
      { title: "Graphing Patterns", description: "Tables and two-rule patterns", targetMedianSeconds: 35, minProblems: 50 },
    ],
  },
  {
    grade: 6,
    title: "Grade 6 Math Mastery",
    skills: [
      { title: "Ratios", description: "Write and simplify ratios", targetMedianSeconds: 30, minProblems: 70 },
      { title: "Unit Rates", description: "Rates and unit rates", targetMedianSeconds: 35, minProblems: 70 },
      { title: "Percent of a Number", description: "Find percentages", targetMedianSeconds: 35, minProblems: 70 },
      { title: "Percent Increase & Decrease", description: "Percent change problems", targetMedianSeconds: 40, minProblems: 60 },
      { title: "GCF & LCM", description: "Greatest common factor and LCM", targetMedianSeconds: 35, minProblems: 60 },
      { title: "Integer Addition & Subtraction", description: "Operations on integers", targetMedianSeconds: 30, minProblems: 80, fluency: true },
      { title: "Integer Multiplication & Division", description: "Sign rules fluency", targetMedianSeconds: 30, minProblems: 80, fluency: true },
      { title: "Evaluate Expressions", description: "Substitute and simplify", targetMedianSeconds: 35, minProblems: 70 },
      { title: "One-Step Equations", description: "x + a = b and ax = b", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Inequalities Introduction", description: "Simple inequalities", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Mean Median Mode", description: "Central tendency", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Data Displays", description: "Dot plots and histograms", targetMedianSeconds: 40, minProblems: 50 },
      { title: "Coordinate Distance", description: "Distance on coordinate plane", targetMedianSeconds: 35, minProblems: 50 },
      { title: "Area of Triangles", description: "½ base × height", targetMedianSeconds: 35, minProblems: 50 },
    ],
  },
  {
    grade: 7,
    title: "Grade 7 Pre-Algebra",
    skills: [
      { title: "Proportional Relationships", description: "Tables, graphs, equations", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Percent Applications", description: "Tax, tip, discount", targetMedianSeconds: 40, minProblems: 70 },
      { title: "Operations with Rational Numbers", description: "Fraction and decimal ops mixed", targetMedianSeconds: 35, minProblems: 80, fluency: true },
      { title: "Two-Step Equations", description: "ax + b = c", targetMedianSeconds: 45, minProblems: 70 },
      { title: "Multi-Step Equations", description: "Distributive and combining", targetMedianSeconds: 45, minProblems: 70 },
      { title: "Inequalities", description: "Solve and graph", targetMedianSeconds: 45, minProblems: 60 },
      { title: "Probability", description: "Simple and compound events", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Statistics & Sampling", description: "Samples and inference", targetMedianSeconds: 40, minProblems: 50 },
      { title: "Circles", description: "Circumference and area", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Angles & Triangles", description: "Supplementary, vertical, sum 180°", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Scale Drawings", description: "Scale factor problems", targetMedianSeconds: 40, minProblems: 50 },
      { title: "Square Roots", description: "Perfect squares and estimation", targetMedianSeconds: 35, minProblems: 60 },
      { title: "Linear Patterns", description: "Slope as rate of change", targetMedianSeconds: 40, minProblems: 60 },
      { title: "Pre-Algebra Mixed Review", description: "Mixed skills fluency", targetMedianSeconds: 45, minProblems: 80, fluency: true },
    ],
  },
];

export const ENGLISH_CURRICULUM: LevelDef[] = [
  {
    grade: 3,
    title: "Grade 3 Reading & Language",
    skills: [
      { title: "Main Idea", description: "Central idea of a passage", minProblems: 50 },
      { title: "Supporting Details", description: "Key details that support main idea", minProblems: 50 },
      { title: "Vocabulary in Context", description: "Context clues", minProblems: 50 },
      { title: "Synonyms & Antonyms", description: "Word relationships", minProblems: 60, fluency: true },
      { title: "Sentence Structure", description: "Complete sentences and fragments", minProblems: 50 },
      { title: "Subjects & Predicates", description: "Parts of a sentence", minProblems: 50 },
      { title: "Capitalization", description: "Proper nouns and sentence starts", minProblems: 60, fluency: true },
      { title: "Punctuation", description: "Commas, periods, questions", minProblems: 50 },
      { title: "Spelling Patterns", description: "Common patterns and rules", minProblems: 60, fluency: true },
      { title: "Author's Purpose", description: "Inform, entertain, persuade", minProblems: 50 },
      { title: "Sequence", description: "Order of events", minProblems: 50 },
    ],
  },
  {
    grade: 4,
    title: "Grade 4 Reading & Language",
    skills: [
      { title: "Reading Comprehension", description: "Fiction and nonfiction", minProblems: 50 },
      { title: "Inference", description: "Draw conclusions from text", minProblems: 50 },
      { title: "Cause and Effect", description: "Relationships in text", minProblems: 50 },
      { title: "Compare and Contrast", description: "Similarities and differences", minProblems: 50 },
      { title: "Paragraph Structure", description: "Topic sentences and transitions", minProblems: 50 },
      { title: "Grammar", description: "Parts of speech", minProblems: 50 },
      { title: "Verb Tense", description: "Past, present, future", minProblems: 60, fluency: true },
      { title: "Pronouns", description: "Subject and object pronouns", minProblems: 50 },
      { title: "Commas", description: "Lists and introductory phrases", minProblems: 50 },
      { title: "Evidence from Text", description: "Cite textual evidence", minProblems: 50 },
      { title: "Figurative Language", description: "Similes and metaphors", minProblems: 50 },
    ],
  },
  {
    grade: 5,
    title: "Grade 5 Reading & Language",
    skills: [
      { title: "Theme", description: "Message of a story", minProblems: 50 },
      { title: "Summarizing", description: "Concise summaries", minProblems: 50 },
      { title: "Vocabulary in Context", description: "Advanced context clues", minProblems: 50 },
      { title: "Prefixes & Suffixes", description: "Word parts and meaning", minProblems: 60, fluency: true },
      { title: "Grammar Usage", description: "Agreement and tense", minProblems: 50 },
      { title: "Complex Sentences", description: "Combine simple sentences", minProblems: 50 },
      { title: "Point of View", description: "First and third person", minProblems: 50 },
      { title: "Text Structure", description: "Problem-solution, chronology", minProblems: 50 },
      { title: "Short Written Responses", description: "Brief constructed responses", minProblems: 50 },
      { title: "Editing & Revising", description: "Improve drafts", minProblems: 50 },
    ],
  },
  {
    grade: 6,
    title: "Grade 6 Reading & Language",
    skills: [
      { title: "Inference", description: "Complex inferential reading", minProblems: 50 },
      { title: "Argument Structure", description: "Claims, reasons, evidence", minProblems: 50 },
      { title: "Text Evidence", description: "Analyze and quote evidence", minProblems: 50 },
      { title: "Author's Craft", description: "Word choice and tone", minProblems: 50 },
      { title: "Sentence Correction", description: "Fix grammar errors", minProblems: 50 },
      { title: "Parallel Structure", description: "Balanced sentence parts", minProblems: 50 },
      { title: "Paragraph Writing", description: "Structured paragraphs", minProblems: 50 },
      { title: "Active vs Passive Voice", description: "Identify and revise voice", minProblems: 50 },
      { title: "Research Skills", description: "Sources and credibility", minProblems: 50 },
      { title: "Connotation & Denotation", description: "Word shades of meaning", minProblems: 50 },
    ],
  },
  {
    grade: 7,
    title: "Grade 7 Reading & Language",
    skills: [
      { title: "Analytical Reading", description: "Deep text analysis", minProblems: 50 },
      { title: "Claims and Evidence", description: "Evaluate arguments", minProblems: 50 },
      { title: "Counterarguments", description: "Address opposing views", minProblems: 50 },
      { title: "Grammar Precision", description: "Advanced grammar rules", minProblems: 50 },
      { title: "Essay Structure", description: "Intro, body, conclusion", minProblems: 50 },
      { title: "Thesis Statements", description: "Clear arguable thesis", minProblems: 50 },
      { title: "Vocabulary Development", description: "Roots and academic words", minProblems: 60, fluency: true },
      { title: "Rhetorical Devices", description: "Ethos, pathos, logos", minProblems: 50 },
      { title: "Synthesis", description: "Combine multiple sources", minProblems: 50 },
      { title: "Formal Writing", description: "Academic tone and style", minProblems: 50 },
    ],
  },
];

export function allSkills(curriculum: LevelDef[]) {
  return curriculum.flatMap((level) =>
    level.skills.map((skill) => ({ ...skill, grade: level.grade })),
  );
}

export function countCurriculumSkills() {
  const math = allSkills(MATH_CURRICULUM).length;
  const english = allSkills(ENGLISH_CURRICULUM).length;
  return { math, english, total: math + english };
}

export function gradeBandForGrade(grade: number) {
  if (grade <= 2) return "K2_FOUNDATION" as const;
  if (grade <= 5) return "GRADES_3_5" as const;
  if (grade <= 8) return "GRADES_6_8" as const;
  if (grade <= 10) return "GRADES_9_10" as const;
  return "GRADES_11_12" as const;
}
