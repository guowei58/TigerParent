export function parseNumericAnswer(value: string): number | null {
  const cleaned = value.trim().replace(/[^0-9.\-/]/g, "");
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function numericAnswersMatch(
  studentAnswer: string,
  correctAnswer: string,
  tolerance = 0.001,
): boolean {
  const a = parseNumericAnswer(studentAnswer);
  const b = parseNumericAnswer(correctAnswer);
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tolerance;
}

export function normalizeExpression(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\*\*/g, "^")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");
}

export function expressionsEquivalent(a: string, b: string): boolean {
  return normalizeExpression(a) === normalizeExpression(b);
}

export function validateMathAnswerDeterministic(input: {
  type: string;
  correctAnswer: string;
  acceptableAnswersJson: unknown;
  answerValidationMethod: string;
  solutionStepsJson: unknown;
}): { valid: boolean; message: string } {
  if (!input.correctAnswer.trim()) {
    return { valid: false, message: "Missing correct answer" };
  }

  if (input.type === "NUMERIC") {
    const parsed = parseNumericAnswer(input.correctAnswer);
    if (parsed === null) {
      return { valid: false, message: "Numeric problem has non-numeric correct answer" };
    }
    return { valid: true, message: "Numeric answer is valid" };
  }

  if (input.type === "MULTIPLE_CHOICE") {
    if (input.correctAnswer.trim().length === 0) {
      return { valid: false, message: "Multiple choice missing correct answer" };
    }
    return { valid: true, message: "Multiple choice answer present" };
  }

  if (input.answerValidationMethod === "MANUAL_REVIEW") {
    return {
      valid: true,
      message: "Manual review required — answer format not deterministically validated",
    };
  }

  return { valid: true, message: "Answer format accepted" };
}
