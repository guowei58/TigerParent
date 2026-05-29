/** Gap between PDF attempts before starting a new topic practice session. */
export const PDF_SESSION_GAP_MS = 2 * 60 * 60 * 1000;

/** Used when per-attempt timers were not recorded (older data). */
export const DEFAULT_SECONDS_PER_PDF_PROBLEM = 90;

const MAX_SECONDS_PER_PROBLEM_ESTIMATE = 300;

type PdfAttemptTiming = {
  createdAt: Date;
  timeSpentSeconds: number | null;
};

type PdfAttemptSession = {
  createdAt: Date;
  conceptId: string | null;
};

/** Topic practice sessions: same concept with attempts within {@link PDF_SESSION_GAP_MS}. */
export function countPdfTopicSessions(attempts: PdfAttemptSession[]): number {
  if (attempts.length === 0) return 0;

  const sorted = [...attempts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let sessions = 0;
  let lastConcept: string | null = null;
  let lastTime = 0;

  for (const att of sorted) {
    const conceptId = att.conceptId ?? "unknown";
    const t = att.createdAt.getTime();
    if (
      sessions === 0 ||
      conceptId !== lastConcept ||
      t - lastTime > PDF_SESSION_GAP_MS
    ) {
      sessions += 1;
      lastConcept = conceptId;
    }
    lastTime = t;
  }

  return sessions;
}

/** Recorded timers plus sensible fallbacks for attempts missing `timeSpentSeconds`. */
export function estimatePdfPracticeSeconds(attempts: PdfAttemptTiming[]): number {
  if (attempts.length === 0) return 0;

  const recorded = attempts.reduce(
    (sum, a) => sum + (a.timeSpentSeconds ?? 0),
    0,
  );
  const missingCount = attempts.filter((a) => a.timeSpentSeconds == null).length;
  const fromPerProblem =
    recorded + missingCount * DEFAULT_SECONDS_PER_PDF_PROBLEM;

  if (attempts.length === 1) {
    return Math.max(
      fromPerProblem,
      attempts[0].timeSpentSeconds ?? DEFAULT_SECONDS_PER_PDF_PROBLEM,
    );
  }

  const sorted = [...attempts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const spanSec =
    (sorted[sorted.length - 1].createdAt.getTime() -
      sorted[0].createdAt.getTime()) /
      1000 +
    DEFAULT_SECONDS_PER_PDF_PROBLEM;
  const cappedSpan = Math.min(
    spanSec,
    attempts.length * MAX_SECONDS_PER_PROBLEM_ESTIMATE,
  );

  return Math.max(fromPerProblem, cappedSpan);
}
