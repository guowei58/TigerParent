import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  PDF_PRACTICE_REQUIRES_SCRATCHPAD,
  parsePdfAttemptStrokes,
  pdfAttemptStrokeCreate,
} from "@/lib/pdf-practice/attempt-strokes";
import { getWorkFeedback } from "@/lib/stroke-analysis";

export type PdfAttemptCreateInput = {
  problemId: string;
  userId: string;
  studentProfileId?: string;
  selectedChoiceLabel?: string | null;
  freeResponseText?: string | null;
  isCorrect?: boolean | null;
  skipped?: boolean;
  timeSpentSeconds?: number | null;
  strokes?: unknown;
  drawingSeconds?: number;
};

export type RecordPdfAttemptResult =
  | { ok: true; attemptId: string }
  | { ok: false; error: string; workFeedback: string | null };

export async function recordPdfProblemAttempt(
  input: PdfAttemptCreateInput,
): Promise<RecordPdfAttemptResult> {
  const problem = await prisma.pdfPracticeProblem.findUnique({
    where: { id: input.problemId },
    select: { subject: true, passageId: true },
  });
  const subject = (problem?.subject ?? "").toLowerCase();
  const isElaReading =
    Boolean(problem?.passageId) ||
    subject.includes("english") ||
    subject.includes("ela");
  const requiresScratchpad = PDF_PRACTICE_REQUIRES_SCRATCHPAD && !isElaReading;

  const { strokes, quality } = parsePdfAttemptStrokes(
    input.strokes,
    input.drawingSeconds,
  );

  if (requiresScratchpad && !quality.showedWork) {
    return {
      ok: false,
      error: "Show your work on the scratchpad before submitting.",
      workFeedback: getWorkFeedback(quality, true),
    };
  }

  const data: Prisma.PdfProblemAttemptUncheckedCreateInput = {
    problemId: input.problemId,
    userId: input.userId,
    studentProfileId: input.studentProfileId,
    selectedChoiceLabel: input.selectedChoiceLabel ?? null,
    freeResponseText: input.freeResponseText ?? null,
    isCorrect: input.isCorrect ?? null,
    skipped: input.skipped ?? false,
    timeSpentSeconds: input.timeSpentSeconds ?? null,
    showedWork: quality.showedWork,
    workQualityJson: quality as unknown as Prisma.InputJsonValue,
    strokes: pdfAttemptStrokeCreate(strokes, input.drawingSeconds),
  };

  const attempt = await prisma.pdfProblemAttempt.create({ data });

  return { ok: true, attemptId: attempt.id };
}
