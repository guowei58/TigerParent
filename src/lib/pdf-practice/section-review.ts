import { prisma } from "@/lib/db";
import {
  resolveProblemProgressFromAttempts,
  type PdfProblemProgressStatus,
} from "@/lib/pdf-practice/progress-shared";
import type { ProgressScope } from "@/lib/pdf-practice/progress";
import { selectApprovedPdfProblems } from "@/lib/pdf-practice/selection";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";

export type SectionReviewItem = {
  problemId: string;
  problemNumber: number;
  questionType: string;
  problemImageUrl: string | null;
  fullPageImageUrl: string | null;
  choices: { label: string; text: string | null }[];
  progressStatus: PdfProblemProgressStatus;
  answerDisplay: string;
  isCorrect: boolean | null;
  skipped: boolean;
  attemptedAt: string | null;
  strokeData: unknown;
  drawingSeconds: number | null;
  attemptCount: number;
};

function formatAnswerDisplay(attempt: {
  skipped: boolean;
  selectedChoiceLabel: string | null;
  freeResponseText: string | null;
}): string {
  if (attempt.skipped) return "Skipped";
  if (attempt.selectedChoiceLabel) return `Choice ${attempt.selectedChoiceLabel}`;
  if (attempt.freeResponseText?.trim()) return attempt.freeResponseText.trim();
  return "—";
}

function scopeWhere(scope: ProgressScope, problemIds: string[]) {
  return {
    problemId: { in: problemIds },
    ...("studentProfileId" in scope
      ? { studentProfileId: scope.studentProfileId }
      : { userId: scope.userId }),
  };
}

export async function getSectionReview(
  scope: ProgressScope,
  options: { conceptSlug?: string; passageId?: string; gradeLevel?: number },
): Promise<SectionReviewItem[]> {
  const problems = await selectApprovedPdfProblems({
    conceptSlug: options.conceptSlug,
    passageId: options.passageId,
    gradeLevel: options.gradeLevel,
    limit: 500,
  });
  if (problems.length === 0) return [];

  const problemIds = problems.map((p) => p.id);
  const attempts = await prisma.pdfProblemAttempt.findMany({
    where: scopeWhere(scope, problemIds),
    include: { strokes: true },
    orderBy: { createdAt: "desc" },
  });

  const byProblem = new Map<string, typeof attempts>();
  for (const att of attempts) {
    const list = byProblem.get(att.problemId) ?? [];
    list.push(att);
    byProblem.set(att.problemId, list);
  }

  const items: SectionReviewItem[] = [];

  for (const problem of problems) {
    const problemAttempts = byProblem.get(problem.id) ?? [];
    const progressStatus = resolveProblemProgressFromAttempts(problemAttempts);
    if (!progressStatus) continue;

    const latest = problemAttempts[0];
    const strokesSource =
      problemAttempts.find((a) => a.strokes) ?? latest ?? null;
    const answerSource =
      problemAttempts.find((a) => !a.skipped) ?? latest ?? null;

    items.push({
      problemId: problem.id,
      problemNumber: problem.problemNumber,
      questionType: problem.questionType,
      problemImageUrl: assetUrl(problemDisplayImagePath(problem)),
      fullPageImageUrl: assetUrl(problem.fullPageImagePath),
      choices: problem.choices.map((c) => ({ label: c.label, text: c.text })),
      progressStatus,
      answerDisplay: answerSource
        ? formatAnswerDisplay(answerSource)
        : "Not attempted",
      isCorrect: answerSource?.isCorrect ?? null,
      skipped: progressStatus === "skipped",
      attemptedAt: latest?.createdAt.toISOString() ?? null,
      strokeData: strokesSource?.strokes?.strokeDataJson ?? null,
      drawingSeconds: strokesSource?.strokes?.drawingSeconds ?? null,
      attemptCount: problemAttempts.length,
    });
  }

  return items;
}
