import { PassageRecordingAudio } from "@/components/pdf/PassageRecordingAudio";
import { formatRecordingDuration } from "@/lib/passage-recording";
import type { DailyPassageRecording } from "@/lib/passage-recording";

function recordingCacheKey(recordedAt: Date | string): string {
  return typeof recordedAt === "string" ? recordedAt : recordedAt.toISOString();
}

export function ParentPassageRecordingCard({
  recording,
}: {
  recording: DailyPassageRecording;
}) {
  const src = `${recording.audioUrl}?v=${encodeURIComponent(recordingCacheKey(recording.recordedAt))}`;

  return (
    <article className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{recording.passageTitle}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Reading recording · {formatRecordingDuration(recording.durationSeconds)}
      </p>
      <div className="mt-3">
        <PassageRecordingAudio
          src={src}
          durationSeconds={recording.durationSeconds}
        />
      </div>
    </article>
  );
}
