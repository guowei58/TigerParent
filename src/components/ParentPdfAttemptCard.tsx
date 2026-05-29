import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { WorkQualityBadge } from "@/components/WorkQualityBadge";
import { ScratchWorkPreview } from "@/components/ScratchWorkPreview";
import {
  formatPdfAttemptAnswer,
  pdfAttemptStatusLabel,
  type DailyPdfWorkAttempt,
} from "@/lib/analytics";
import {
  PDF_PRACTICE_REQUIRES_SCRATCHPAD,
  resolvePdfAttemptWorkQuality,
} from "@/lib/pdf-practice/attempt-strokes";

export function ParentPdfAttemptCard({
  attempt,
  selectedDate,
}: {
  attempt: DailyPdfWorkAttempt;
  selectedDate: string;
}) {
  const quality = resolvePdfAttemptWorkQuality(attempt);
  const href = `/student/for-parents/pdf-work/${attempt.id}?date=${selectedDate}`;

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm text-slate-900">
            {attempt.topicTitle}
            <span className="font-normal text-slate-400"> · {attempt.subjectLabel}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {attempt.createdAt.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
            {attempt.timeSpentSeconds != null ? ` · ${attempt.timeSpentSeconds}s` : ""}
            {" · "}
            Answer: {formatPdfAttemptAnswer(attempt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={
              attempt.isCorrect === true
                ? "text-sm font-medium text-emerald-600"
                : attempt.skipped
                  ? "text-sm font-medium text-amber-600"
                  : "text-sm font-medium text-rose-600"
            }
          >
            {pdfAttemptStatusLabel(attempt)}
          </span>
          <span className="text-xs font-medium text-indigo-600 group-hover:text-indigo-800">
            View full detail →
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question
          </p>
          {attempt.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attempt.imageUrl}
              alt="Practice question"
              className="max-h-40 w-full rounded-lg border border-slate-200 bg-white object-contain"
            />
          ) : (
            <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
              No question image
            </div>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Scratch work
          </p>
          <ScratchWorkPreview strokeData={attempt.strokes?.strokeDataJson} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <WorkQualityBadge
          quality={quality}
          requiresScratchpad={PDF_PRACTICE_REQUIRES_SCRATCHPAD}
        />
        {attempt.strokes && <Badge variant="info">Strokes saved</Badge>}
      </div>
    </Link>
  );
}
