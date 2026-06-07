import { PassageRecordingAudio } from "@/components/pdf/PassageRecordingAudio";
import { PdfPassagePanel } from "@/components/pdf/PdfPassagePanel";
import { ScratchWorkPreview } from "@/components/ScratchWorkPreview";
import {
  formatPdfAttemptAnswer,
  pdfAttemptStatusLabel,
  type DailyPdfWorkAttempt,
  type DailyWorkAttempt,
} from "@/lib/analytics";
import { formatRecordingDuration } from "@/lib/passage-recording";
import type { DailyPassageRecording } from "@/lib/passage-recording";
import { gradeLabel } from "@/lib/utils";

function recordingCacheKey(recordedAt: Date | string): string {
  return typeof recordedAt === "string" ? recordedAt : recordedAt.toISOString();
}

function ParentPassageRecordingSection({
  recording,
}: {
  recording: DailyPassageRecording;
}) {
  const src = `${recording.audioUrl}?v=${encodeURIComponent(recordingCacheKey(recording.recordedAt))}`;

  return (
    <div>
      {recording.passageTitle && (
        <p className="mb-1 text-sm font-medium text-violet-900">{recording.passageTitle}</p>
      )}
      <p className="mb-2 text-xs text-slate-500">
        Reading recording · {formatRecordingDuration(recording.durationSeconds)}
      </p>
      <PassageRecordingAudio
        src={src}
        durationSeconds={recording.durationSeconds}
      />
    </div>
  );
}

export function ParentPdfAttemptCard({
  attempt,
  passageRecording,
}: {
  attempt: DailyPdfWorkAttempt;
  /** Recording for this passage; pass `null` when none saved. Omit for non-ELA. */
  passageRecording?: DailyPassageRecording | null;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{attempt.topicTitle}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {attempt.subjectLabel}
            {attempt.gradeLevel != null && (
              <span> · {gradeLabel(attempt.gradeLevel)}</span>
            )}
          </p>
        </div>
        <span
          className={
            attempt.isCorrect === true
              ? "shrink-0 text-sm font-semibold text-emerald-600"
              : attempt.skipped
                ? "shrink-0 text-sm font-semibold text-amber-600"
                : "shrink-0 text-sm font-semibold text-rose-600"
          }
        >
          {pdfAttemptStatusLabel(attempt)}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Answer: <span className="font-medium text-slate-800">{formatPdfAttemptAnswer(attempt)}</span>
        {attempt.timeSpentSeconds != null && (
          <span className="text-slate-400"> · {attempt.timeSpentSeconds}s</span>
        )}
      </p>

      <div className="mt-4 space-y-4">
        {attempt.isElaReading && attempt.passage && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Passage
            </p>
            <PdfPassagePanel passage={attempt.passage} variant="student" />
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question
          </p>
          {attempt.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attempt.imageUrl}
              alt="Practice question"
              className="w-full max-h-64 rounded-xl border border-slate-200 bg-white object-contain"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No question image
            </div>
          )}
        </div>
        {attempt.isElaReading ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800">
              Reading recording
            </p>
            {passageRecording ? (
              <ParentPassageRecordingSection recording={passageRecording} />
            ) : (
              <p className="text-sm text-slate-500">No reading recording saved for this passage.</p>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Scratch work
            </p>
            <ScratchWorkPreview strokeData={attempt.strokes?.strokeDataJson} className="min-h-40" />
          </div>
        )}
      </div>
    </article>
  );
}

export function ParentLegacyAttemptCard({ attempt }: { attempt: DailyWorkAttempt }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{attempt.problem.skill.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{attempt.problem.skill.subject.name}</p>
        </div>
        <span
          className={
            attempt.isCorrect
              ? "shrink-0 text-sm font-semibold text-emerald-600"
              : "shrink-0 text-sm font-semibold text-rose-600"
          }
        >
          {attempt.isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{attempt.problem.prompt}</p>
      <p className="mt-2 text-sm text-slate-600">
        Answer: <span className="font-medium text-slate-800">{attempt.answer}</span>
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scratch work
        </p>
        <ScratchWorkPreview
          strokeData={attempt.strokes?.strokeDataJson}
          className="min-h-40"
        />
      </div>
    </article>
  );
}
