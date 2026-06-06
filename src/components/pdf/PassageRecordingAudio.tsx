"use client";

import { useCallback, useEffect, useRef } from "react";
import { formatRecordingDuration } from "@/lib/passage-recording";

/** MediaRecorder WebM often reports 0:00 until the browser scans to the end. */
function repairWebmDuration(audio: HTMLAudioElement) {
  if (Number.isFinite(audio.duration) && audio.duration > 0) return;

  const onTimeUpdate = () => {
    audio.removeEventListener("timeupdate", onTimeUpdate);
    audio.currentTime = 0;
  };
  audio.addEventListener("timeupdate", onTimeUpdate);
  try {
    audio.currentTime = 1e101;
  } catch {
    audio.removeEventListener("timeupdate", onTimeUpdate);
  }
}

export function PassageRecordingAudio({
  src,
  durationSeconds,
  onError,
}: {
  src: string;
  durationSeconds?: number | null;
  onError?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    repairWebmDuration(audio);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      repairWebmDuration(audio);
    }
  }, [src]);

  const durationLabel = formatRecordingDuration(durationSeconds);

  return (
    <div>
      {durationSeconds != null && durationSeconds > 0 && (
        <p className="mb-2 text-xs text-slate-500">
          Length: {durationLabel}
        </p>
      )}
      <audio
        ref={audioRef}
        key={src}
        controls
        controlsList="nodownload"
        src={src}
        className="block w-full max-w-full"
        preload="auto"
        onLoadedMetadata={onLoadedMetadata}
        onError={onError}
      />
    </div>
  );
}
