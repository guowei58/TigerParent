import { createHash } from "crypto";

export type McqChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
  rationale: string;
  misconception?: string;
};

export type McqChoiceInput = {
  text: string;
  isCorrect: boolean;
  rationale: string;
  misconception?: string;
};

const GENERIC_DISTRACTOR_PATTERNS = [
  /^a made-up definition$/i,
  /^the opposite of the word$/i,
  /^a word that sounds similar/i,
  /^random step$/i,
  /^finally step$/i,
  /^none of the above$/i,
  /^an idea not mentioned/i,
  /^the passage has no purpose$/i,
  /^the author dislikes the topic$/i,
];

export function isGenericDistractor(text: string): boolean {
  const trimmed = text.trim();
  return GENERIC_DISTRACTOR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function choiceIdForText(text: string, seed = ""): string {
  return createHash("sha256").update(`${seed}:${text}`).digest("hex").slice(0, 12);
}

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const array = [...items];
  let state = seed || 1;
  const rand = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function buildMcqChoices(
  inputs: McqChoiceInput[],
  shuffleSeed: number,
): { choices: McqChoice[]; correctChoiceId: string; choicesJson: string[] } {
  const withIds = inputs.map((input) => ({
    id: choiceIdForText(input.text, String(shuffleSeed)),
    ...input,
  }));

  const invalid = withIds.filter(
    (c) => !c.isCorrect && isGenericDistractor(c.text),
  );
  if (invalid.length > 0) {
    throw new Error(
      `Generic distractors rejected: ${invalid.map((c) => c.text).join(", ")}`,
    );
  }

  const wrongWithoutRationale = withIds.filter(
    (c) => !c.isCorrect && !c.rationale?.trim(),
  );
  if (wrongWithoutRationale.length > 0) {
    throw new Error("Every distractor must include a rationale.");
  }

  const shuffled = shuffleWithSeed(withIds, shuffleSeed);
  const correct = shuffled.find((c) => c.isCorrect);
  if (!correct) {
    throw new Error("MCQ must include exactly one correct choice.");
  }

  return {
    choices: shuffled,
    correctChoiceId: correct.id,
    choicesJson: shuffled.map((c) => c.text),
  };
}

export function buildDistractorRationaleJson(choices: McqChoice[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const choice of choices) {
    if (!choice.isCorrect) {
      out[choice.id] = choice.rationale;
    }
  }
  return out;
}

export function resolveChoiceAnswer(
  answer: string,
  problem: {
    id?: string;
    correctAnswer: string;
    correctChoiceId?: string | null;
    choicesWithIdsJson?: unknown;
    choicesJson?: unknown;
  },
): boolean {
  const normalized = answer.trim().toLowerCase();

  if (problem.correctChoiceId && normalized === problem.correctChoiceId.toLowerCase()) {
    return true;
  }

  const withIds = parseChoicesWithIds(problem.choicesWithIdsJson);
  if (withIds.length) {
    const byId = withIds.find((c) => c.id.toLowerCase() === normalized);
    if (byId) return byId.isCorrect;
    const byText = withIds.find((c) => c.text.trim().toLowerCase() === normalized);
    if (byText) return byText.isCorrect;
  }

  const legacy = Array.isArray(problem.choicesJson)
    ? (problem.choicesJson as string[])
    : [];
  if (legacy.length && problem.id) {
    const correctText = problem.correctAnswer.trim().toLowerCase();
    for (const text of legacy) {
      const id = choiceIdForText(text, problem.id);
      if (id.toLowerCase() === normalized) {
        return text.trim().toLowerCase() === correctText;
      }
    }
  }

  return normalized === problem.correctAnswer.trim().toLowerCase();
}

export function parseChoicesWithIds(raw: unknown): McqChoice[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is McqChoice =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as McqChoice).id === "string" &&
      typeof (item as McqChoice).text === "string",
  );
}

export function displayChoicesForProblem(problem: {
  choicesWithIdsJson?: unknown;
  choicesJson?: unknown;
  correctAnswer?: string;
  correctChoiceId?: string | null;
  id: string;
}): McqChoice[] {
  const withIds = parseChoicesWithIds(problem.choicesWithIdsJson);
  if (withIds.length) {
    return shuffleWithSeed(withIds, hashProblemSeed(problem.id));
  }
  const legacy = Array.isArray(problem.choicesJson)
    ? (problem.choicesJson as string[])
    : [];
  const correctText = problem.correctAnswer?.trim().toLowerCase() ?? "";
  return shuffleWithSeed(
    legacy.map((text) => ({
      id: choiceIdForText(text, problem.id),
      text,
      isCorrect: text.trim().toLowerCase() === correctText,
      rationale: "",
    })),
    hashProblemSeed(problem.id),
  );
}

function hashProblemSeed(problemId: string): number {
  let hash = 0;
  for (let i = 0; i < problemId.length; i++) {
    hash = (hash * 31 + problemId.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}
