export type ParsedAnswerKeyEntry = {
  problemNumber: number;
  rawAnswerText: string;
  correctChoiceLabel: string | null;
  correctAnswerText: string | null;
  extractionConfidence: number;
  warnings: string[];
};

/** "1. Answer: C Objective: CC 6.G.4 Points: 1" — letter MCQ on same line */
const INLINE_MCQ_RE =
  /(?:^|[\s\n\r])(\d{1,3})\.\s*Answer:\s*([A-D])(?=\s+Objective:|\s+Points:|\s*\d{1,3}\.\s*Answer:|\n\n|$)/gi;

/** "197. Answer: $90 Objective: ..." or "8. Answer: [drawing]" */
const INLINE_TEXT_ANSWER_RE =
  /(?:^|[\s\n\r])(\d{1,3})\.\s*Answer:\s*(\$[\d.,]+|\[[^\]]+\])(?=\s+Objective:|\s+Points:|\s*\d{1,3}\.\s*Answer:|\n\n|$)/gi;

/** "1.\nAnswer: C\nObjective:" (stacked rows) */
const STACKED_ANSWER_RE =
  /(?:^|[\s\n\r])(\d{1,3})\.\s*[\n\r]+\s*Answer:\s*([A-D])\s*(?:[\n\r]+|Objective:|Points:|$)/gi;

/** "20. Answer: n/a Objective: ..." — open response, no letter key */
const INLINE_NA_RE =
  /(?:^|[\s\n\r])(\d{1,3})\.\s*Answer:\s*(n\/a)(?=\s+Objective:|\s+Points:|\s*\d{1,3}\.\s*Answer:|\n\n|$)/gi;

/** Simple "Answer Key\n1. C\n2. B" */
const ENTRY_RE =
  /(?:^|[\n\r])\s*#?(\d{1,3})\s*[\.\):\-]?\s*([A-D]|[A-D]\s*[\-\u2013\u2014]\s*[A-D]|[^\n]{1,120})/gi;

const STRUCTURED_ANSWER_LINE_RE = /\d{1,3}\.\s*Answer:\s*/i;

function pushEntry(
  entries: ParsedAnswerKeyEntry[],
  seen: Set<number>,
  problemNumber: number,
  raw: string,
) {
  if (problemNumber < 1 || problemNumber > 500 || seen.has(problemNumber)) return;
  seen.add(problemNumber);

  const warnings: string[] = [];
  let correctChoiceLabel: string | null = null;
  let correctAnswerText: string | null = null;

  const trimmed = raw.trim();
  if (/^n\/a$/i.test(trimmed)) {
    correctAnswerText = "n/a";
    warnings.push("Open-response item — no letter key.");
    entries.push({
      problemNumber,
      rawAnswerText: trimmed,
      correctChoiceLabel,
      correctAnswerText,
      extractionConfidence: 0.85,
      warnings,
    });
    return;
  }

  const letterOnly = trimmed.match(/^([A-D])$/i);
  const letterInAnswer = trimmed.match(/^([A-D])\b/i);
  const moneyAnswer = trimmed.match(/^\$[\d.,]+/);

  if (letterOnly) {
    correctChoiceLabel = letterOnly[1]!.toUpperCase();
    correctAnswerText = correctChoiceLabel;
  } else if (letterInAnswer) {
    correctChoiceLabel = letterInAnswer[1]!.toUpperCase();
    correctAnswerText = trimmed;
  } else if (moneyAnswer) {
    correctAnswerText = moneyAnswer[0]!;
  } else if (trimmed.startsWith("[")) {
    correctAnswerText = trimmed;
    warnings.push("Non-MCQ answer — verify manually.");
  } else if (trimmed.length > 0) {
    correctAnswerText = trimmed;
  }

  entries.push({
    problemNumber,
    rawAnswerText: trimmed,
    correctChoiceLabel,
    correctAnswerText,
    extractionConfidence: correctChoiceLabel ? 0.92 : trimmed ? 0.75 : 0.4,
    warnings,
  });
}

export function parseAnswerKey(answerKeySection: string): ParsedAnswerKeyEntry[] {
  const entries: ParsedAnswerKeyEntry[] = [];
  const seen = new Set<number>();

  const normalized = answerKeySection.replace(/\r\n/g, "\n");
  const structuredPatterns = [INLINE_MCQ_RE, INLINE_TEXT_ANSWER_RE, INLINE_NA_RE, STACKED_ANSWER_RE];
  const patterns = STRUCTURED_ANSWER_LINE_RE.test(normalized)
    ? structuredPatterns
    : [...structuredPatterns, ENTRY_RE];

  for (const re of patterns) {
    const regex = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(normalized)) !== null) {
      pushEntry(entries, seen, parseInt(m[1]!, 10), m[2]!);
    }
  }

  return entries.sort((a, b) => a.problemNumber - b.problemNumber);
}
