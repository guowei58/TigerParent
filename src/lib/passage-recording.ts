export function passageRecordingAudioUrl(recordingId: string): string {
  return `/api/practice/passage-recording/${recordingId}/audio`;
}

export function formatRecordingDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export type DailyPassageRecording = {
  id: string;
  passageId: string;
  passageTitle: string;
  durationSeconds: number | null;
  recordedAt: Date | string;
  audioUrl: string;
};
