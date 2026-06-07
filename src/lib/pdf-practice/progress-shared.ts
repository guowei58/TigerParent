/** correct = first try right; incorrect = wrong at least once before getting it right; skipped = skipped; submitted = parent-graded open response */
export type PdfProblemProgressStatus = "correct" | "incorrect" | "skipped" | "submitted";

export type PdfPracticeProgress = {
  byProblemId: Record<string, PdfProblemProgressStatus>;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  submittedCount: number;
  resumeIndex: number;
};

export function isPdfProblemComplete(
  status: PdfProblemProgressStatus | undefined | null,
): boolean {
  return (
    status === "correct" ||
    status === "incorrect" ||
    status === "submitted"
  );
}

export function resolveProblemProgressFromAttempts(
  attempts: {
    isCorrect: boolean | null;
    skipped: boolean;
    freeResponseText?: string | null;
  }[],
): PdfProblemProgressStatus | null {
  const answered = attempts.filter((a) => !a.skipped);
  if (answered.length > 0) {
    const hadWrong = answered.some((a) => a.isCorrect === false);
    const hadCorrect = answered.some((a) => a.isCorrect === true);
    const parentSubmitted = answered.some(
      (a) => a.isCorrect === null && Boolean(a.freeResponseText?.trim()),
    );

    if (parentSubmitted && !hadCorrect && !hadWrong) return "submitted";
    if (hadWrong && hadCorrect) return "incorrect";
    if (hadCorrect) return "correct";
    return null;
  }

  if (attempts.some((a) => a.skipped)) return "skipped";
  return null;
}

export type AttemptOutcomeInput = {
  isCorrect: boolean | null;
  skipped: boolean;
};

/** Like {@link resolveProblemProgressFromAttempts} but counts a lone wrong submit as incorrect (for reporting). */
export function resolveProblemProgressForReporting(
  attempts: AttemptOutcomeInput[],
): PdfProblemProgressStatus | null {
  const status = resolveProblemProgressFromAttempts(attempts);
  if (status) return status;
  if (attempts.some((a) => !a.skipped && a.isCorrect === false)) {
    return "incorrect";
  }
  return null;
}

/** One row per problem per day — retries after a wrong answer still count as one problem (incorrect). */
export function countUniqueProblemsFromAttempts(
  attempts: (AttemptOutcomeInput & { problemId: string })[],
): {
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
} {
  const byProblem = new Map<string, AttemptOutcomeInput[]>();
  for (const a of attempts) {
    const list = byProblem.get(a.problemId) ?? [];
    list.push({ isCorrect: a.isCorrect, skipped: a.skipped });
    byProblem.set(a.problemId, list);
  }

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  for (const problemAttempts of byProblem.values()) {
    const status = resolveProblemProgressForReporting(problemAttempts);
    if (status === "correct") correct += 1;
    else if (status === "incorrect") incorrect += 1;
    else if (status === "skipped") skipped += 1;
  }

  return {
    attempted: correct + incorrect + skipped,
    correct,
    incorrect,
    skipped,
  };
}

export function countProgressStatuses(
  byProblemId: Record<string, PdfProblemProgressStatus>,
) {
  const values = Object.values(byProblemId);
  return {
    correct: values.filter((v) => v === "correct").length,
    incorrect: values.filter((v) => v === "incorrect").length,
    skipped: values.filter((v) => v === "skipped").length,
    submitted: values.filter((v) => v === "submitted").length,
    /** Answered problems only — skipped still counts as left to do. */
    done: values.filter((v) => isPdfProblemComplete(v)).length,
  };
}

/** Next unanswered problem in list order (includes skipped and not started). */
export function findFirstIncompleteIndex(
  problems: { id: string }[],
  progress: Record<string, PdfProblemProgressStatus | undefined>,
  afterIndex = -1,
): number {
  for (let i = afterIndex + 1; i < problems.length; i++) {
    if (!isPdfProblemComplete(progress[problems[i]!.id])) return i;
  }
  for (let i = 0; i <= Math.min(afterIndex, problems.length - 1); i++) {
    if (!isPdfProblemComplete(progress[problems[i]!.id])) return i;
  }
  return -1;
}

export function buildPdfPracticeProgress(
  problemIds: string[],
  progressMap: Map<string, PdfProblemProgressStatus>,
): PdfPracticeProgress {
  const byProblemId: Record<string, PdfProblemProgressStatus> = {};
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  let submittedCount = 0;

  for (const id of problemIds) {
    const status = progressMap.get(id);
    if (status) {
      byProblemId[id] = status;
      if (status === "correct") correctCount++;
      else if (status === "incorrect") incorrectCount++;
      else if (status === "skipped") skippedCount++;
      else submittedCount++;
    }
  }

  const firstIncomplete = problemIds.findIndex(
    (id) => !isPdfProblemComplete(progressMap.get(id)),
  );
  const resumeIndex =
    firstIncomplete === -1
      ? Math.max(0, problemIds.length - 1)
      : firstIncomplete;

  return {
    byProblemId,
    correctCount,
    incorrectCount,
    skippedCount,
    submittedCount,
    resumeIndex,
  };
}
