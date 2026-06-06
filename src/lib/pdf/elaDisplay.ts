import type { PdfPassageView } from "@/lib/pdf/passageView";
import type { ChoiceRow } from "./elaMcqPatterns";
import { findFirstChoiceLabelIndex, stripStemFooter } from "./elaMcqPatterns";

export type { ChoiceRow };

/** Strip trailing A–D lines when structured choices exist in the database. */
export function elaQuestionStem(
  cleanedText: string | null | undefined,
  choices: ChoiceRow[],
): string {
  if (!cleanedText?.trim()) {
    return "Answer the question using the passage.";
  }

  let text = cleanedText.trim();

  if (choices.length > 0 || /\sA\s+(?=[\u201c\u201d"A-Z])/i.test(text)) {
    const choiceStart = findFirstChoiceLabelIndex(text);
    if (choiceStart > 0) {
      text = text.slice(0, choiceStart).trim();
    } else {
      const lines = text.split("\n");
      const choiceLine = /^(?:[A-Da-d]\s*[\).:\-]\s*.+|[A-Da-d]\s+\S+)/;
      while (lines.length > 0) {
        const last = lines[lines.length - 1]?.trim() ?? "";
        if (choiceLine.test(last)) {
          lines.pop();
        } else {
          break;
        }
      }
      text = lines.join("\n").trim();
    }
  }

  return stripStemFooter(text) || cleanedText.trim();
}

export function isElaReadingProblem(problem: {
  subject?: string | null;
  passage?: PdfPassageView | null;
  passageId?: string | null;
}): boolean {
  if (problem.passage || problem.passageId) return true;
  const subject = (problem.subject ?? "").toLowerCase();
  return subject.includes("english") || subject.includes("ela");
}

/** ELA short-response items — saved for parent review, not auto-graded. */
export function isParentGradedElaResponse(problem: {
  questionType: string;
  subject?: string | null;
  passageId?: string | null;
}): boolean {
  if (!isElaReadingProblem(problem)) return false;
  return problem.questionType === "open_response" || problem.questionType === "short_answer";
}

export function resolveElaPassage<T extends { passageId?: string | null; passage?: PdfPassageView | null }>(
  problems: T[],
  current: T,
): PdfPassageView | null {
  if (current.passage) return current.passage;
  if (!current.passageId) return null;
  const sibling = problems.find(
    (p) => p.passageId === current.passageId && p.passage,
  );
  return sibling?.passage ?? null;
}

export function elaPassageGroupInfo<T extends { id: string; passageId?: string | null }>(
  problems: T[],
  current: T,
): { index: number; total: number } | null {
  if (!current.passageId) return null;
  const group = problems.filter((p) => p.passageId === current.passageId);
  const index = group.findIndex((p) => p.id === current.id);
  if (index < 0) return null;
  return { index: index + 1, total: group.length };
}
