import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StrokeViewer } from "@/components/StrokeViewer";
import { WorkQualityBadge } from "@/components/WorkQualityBadge";
import type { WorkQuality } from "@/lib/stroke-analysis";
import { PDF_PRACTICE_REQUIRES_SCRATCHPAD } from "@/lib/pdf-practice/attempt-strokes";

type PdfAttemptDetail = {
  id: string;
  createdAt: Date;
  isCorrect: boolean | null;
  skipped: boolean;
  selectedChoiceLabel: string | null;
  freeResponseText: string | null;
  timeSpentSeconds: number | null;
  topicTitle: string;
  subjectLabel: string;
  imageUrl: string | null;
  strokes: { strokeDataJson: unknown; drawingSeconds: number | null } | null;
  workQuality: WorkQuality;
};

function formatAnswer(attempt: PdfAttemptDetail): string {
  if (attempt.skipped) return "Skipped";
  if (attempt.selectedChoiceLabel) return `Choice ${attempt.selectedChoiceLabel}`;
  if (attempt.freeResponseText?.trim()) return attempt.freeResponseText.trim();
  return "—";
}

function statusLabel(attempt: PdfAttemptDetail): string {
  if (attempt.skipped) return "Skipped";
  if (attempt.isCorrect === true) return "Correct";
  if (attempt.isCorrect === false) return "Incorrect";
  return "Attempted";
}

export function PdfAttemptReviewDetail({ attempt }: { attempt: PdfAttemptDetail }) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{attempt.topicTitle}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{attempt.subjectLabel}</p>
            <p className="text-xs text-slate-400 mt-1">
              {attempt.createdAt.toLocaleString()}
              {attempt.timeSpentSeconds != null
                ? ` · ${attempt.timeSpentSeconds}s on problem`
                : ""}
            </p>
          </div>
          <Badge
            variant={
              attempt.isCorrect === true
                ? "success"
                : attempt.skipped
                  ? "warning"
                  : "default"
            }
          >
            {statusLabel(attempt)}
          </Badge>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">Question</CardTitle>
        {attempt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attempt.imageUrl}
            alt="Practice question"
            className="w-full max-h-[min(70vh,520px)] object-contain rounded-xl border border-slate-200 bg-white"
          />
        ) : (
          <p className="text-sm text-slate-500">No question image available.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">Student&apos;s answer</CardTitle>
        <p className="text-lg font-semibold text-slate-900">{formatAnswer(attempt)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <WorkQualityBadge
            quality={attempt.workQuality}
            requiresScratchpad={PDF_PRACTICE_REQUIRES_SCRATCHPAD}
          />
          {attempt.workQuality.showedWork && (
            <p className="text-xs text-slate-500">
              {attempt.workQuality.strokeCount} strokes ·{" "}
              {attempt.workQuality.totalPathLength}px ink
              {attempt.strokes?.drawingSeconds
                ? ` · ${attempt.strokes.drawingSeconds}s on scratchpad`
                : ""}
            </p>
          )}
        </div>
        {PDF_PRACTICE_REQUIRES_SCRATCHPAD && !attempt.workQuality.showedWork && (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
            Scratch work was required, but little or no work was captured for this
            attempt.
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">Scratch work</CardTitle>
        <p className="text-sm text-slate-500">
          Everything your child drew on the scratchpad while working this problem.
        </p>
        {attempt.strokes ? (
          <StrokeViewer
            strokeData={attempt.strokes.strokeDataJson}
            width={720}
            height={360}
            className="max-w-full"
            emptyMessage="Stroke data was saved but could not be displayed."
          />
        ) : (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            No scratch work was saved. Older attempts from before scratch tracking
            won&apos;t have strokes here.
          </p>
        )}
      </Card>
    </div>
  );
}
