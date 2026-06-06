"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { PassageRecordingAudio } from "@/components/pdf/PassageRecordingAudio";
import { Button } from "@/components/ui/Button";
import { peakAmplitudeFromBlob } from "@/lib/audio/analyzeAudio";
import { formatRecordingDuration } from "@/lib/passage-recording";
import { cn } from "@/lib/utils";

type SavedRecording = {
  id: string;
  durationSeconds: number | null;
  recordedAt: string;
  audioUrl: string;
  fileBytes?: number;
};

type MicDevice = { deviceId: string; label: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pickMediaRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function rmsFromAnalyser(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

export function PassageReadingRecorder({ passageId }: { passageId: string }) {
  const [saved, setSaved] = useState<SavedRecording | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [lastBlobBytes, setLastBlobBytes] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micDevices, setMicDevices] = useState<MicDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const meterContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const playbackUrlRef = useRef<string | null>(null);
  const maxLevelRef = useRef(0);

  function revokePlaybackUrl() {
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
    setPlaybackUrl(null);
  }

  const setPlaybackFromBlob = useCallback((blob: Blob) => {
    revokePlaybackUrl();
    const url = URL.createObjectURL(blob);
    playbackUrlRef.current = url;
    setPlaybackUrl(url);
    setPlaybackError(null);
  }, []);

  const refreshMicDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices
      .filter((d) => d.kind === "audioinput")
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
    setMicDevices(mics);
    if (mics.length > 0 && !selectedMicId) {
      setSelectedMicId(mics[0]!.deviceId);
    }
  }, [selectedMicId]);

  const loadSaved = useCallback(async () => {
    const res = await fetch(
      `/api/practice/passage-recording?passageId=${encodeURIComponent(passageId)}`,
      { credentials: "include" },
    );
    if (!res.ok) return;
    const data = (await res.json()) as { recording: SavedRecording | null };
    if (!data.recording) {
      setSaved(null);
      return;
    }

    const bytes = data.recording.fileBytes ?? 0;
    if (bytes < 8000) {
      setSaved(null);
      setPlaybackError("Previous recording was broken — please record again.");
      return;
    }

    setSaved(data.recording);
    try {
      const cacheBust = encodeURIComponent(data.recording.recordedAt);
      const audioRes = await fetch(`${data.recording.audioUrl}?v=${cacheBust}`, {
        credentials: "include",
      });
      if (!audioRes.ok) throw new Error("Could not load saved recording.");
      const blob = await audioRes.blob();
      if (blob.size < 2000) throw new Error("Saved recording is too small.");
      setLastBlobBytes(blob.size);
      setPlaybackFromBlob(blob);
    } catch (err) {
      setSaved(null);
      setPlaybackError(
        err instanceof Error ? err.message : "Could not load saved recording.",
      );
    }
  }, [passageId, setPlaybackFromBlob]);

  useEffect(() => {
    void loadSaved();
    void refreshMicDevices();
    return () => cleanupCapture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageId]);

  function cleanupCapture() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    timerRef.current = null;
    levelTimerRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void meterContextRef.current?.close();
    meterContextRef.current = null;
  }

  async function startRecording() {
    setError(null);
    setPlaybackError(null);
    revokePlaybackUrl();
    setLastBlobBytes(null);
    setMicLevel(0);
    maxLevelRef.current = 0;
    chunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser.");
      return;
    }

    const mimeType = pickMediaRecorderMimeType();
    if (!mimeType) {
      setError("This browser cannot record audio.");
      return;
    }
    mimeTypeRef.current = mimeType;

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      };
      if (selectedMicId) {
        audioConstraints.deviceId = { exact: selectedMicId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;
      await refreshMicDevices();

      const meterContext = new AudioContext();
      await meterContext.resume();
      meterContextRef.current = meterContext;
      const source = meterContext.createMediaStreamSource(stream);
      const analyser = meterContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;
      recorder.start();

      levelTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const rms = rmsFromAnalyser(analyserRef.current);
        maxLevelRef.current = Math.max(maxLevelRef.current, rms);
        setMicLevel(rms);
      }, 80);

      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      setRecording(true);
    } catch {
      cleanupCapture();
      setError(
        "Could not access the microphone. Allow mic access and pick the correct device below.",
      );
    }
  }

  async function stopRecording() {
    if (elapsed < 5) {
      setError("Record for at least 5 seconds before stopping.");
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    setRecording(false);

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        try {
          recorder.requestData();
        } catch {
          /* ignore */
        }
        recorder.stop();
      });
      await new Promise((r) => setTimeout(r, 150));
    }

    const chunks = [...chunksRef.current];
    chunksRef.current = [];
    cleanupCapture();

    if (chunks.length === 0) {
      setError("No audio captured. Try a different microphone from the list below.");
      return;
    }

    const blob = new Blob(chunks, {
      type: mimeTypeRef.current.split(";")[0] || "audio/webm",
    });
    const ext = blob.type.includes("mp4") ? "reading.m4a" : "reading.webm";
    const minBytes = Math.max(2000, durationSeconds * 400);

    if (blob.size < minBytes) {
      setError(
        `Recording failed (${formatBytes(blob.size)}). Pick a different mic, speak louder, and record at least 5 seconds.`,
      );
      return;
    }

    const peak = await peakAmplitudeFromBlob(blob);
    if (peak < 0.002 && maxLevelRef.current < 0.003) {
      setError(
        "No voice detected. Choose a different microphone below, check Windows Sound settings, then try again.",
      );
      return;
    }

    setLastBlobBytes(blob.size);
    setPlaybackFromBlob(blob);
    setSaved(null);

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("passageId", passageId);
      fd.set("durationSeconds", String(durationSeconds));
      fd.set("audio", blob, ext);

      const res = await fetch("/api/practice/passage-recording", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        recording?: SavedRecording;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save recording.");
      }

      const savedRecording = data.recording;
      if (!savedRecording) {
        await loadSaved();
        return;
      }

      setSaved({ ...savedRecording, fileBytes: blob.size });
      setLastBlobBytes(blob.size);
      // Keep the local blob for playback — it already passed validation.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save recording.");
    } finally {
      setUploading(false);
    }
  }

  const displayDuration = recording
    ? elapsed
    : saved?.durationSeconds ?? null;

  const levelPct = Math.min(100, Math.round(micLevel * 500));

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
      <p className="text-sm font-semibold text-violet-900">Read the passage aloud</p>
      <p className="mt-1 text-xs text-violet-800/80 leading-relaxed">
        Pick your microphone, record at least 5 seconds of reading, then tap Stop.
      </p>

      {micDevices.length > 0 && !recording && (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-violet-900">Microphone</span>
          <select
            value={selectedMicId}
            onChange={(e) => setSelectedMicId(e.target.value)}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {micDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading}
            onClick={() => void startRecording()}
            className="gap-2"
          >
            <Mic className="h-4 w-4" aria-hidden />
            {saved ? "Re-record" : "Start recording"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => void stopRecording()}
            className="gap-2"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            Stop ({formatRecordingDuration(elapsed)})
          </Button>
        )}
        {uploading && (
          <span className="text-xs font-medium text-violet-700">Saving…</span>
        )}
        {saved && !recording && !uploading && !error && (
          <span className="text-xs text-violet-700">
            Saved · {formatRecordingDuration(displayDuration)}
            {lastBlobBytes != null ? ` · ${formatBytes(lastBlobBytes)}` : ""}
          </span>
        )}
      </div>

      {recording && (
        <div className="mt-3 space-y-2">
          <p className={cn("text-xs font-medium text-rose-600 animate-pulse")}>
            Recording… speak now. The mic bar should move when you talk.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-violet-700">Mic</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-violet-200">
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-75"
                style={{ width: `${Math.max(levelPct, 2)}%` }}
              />
            </div>
            {levelPct < 5 && (
              <span className="text-[10px] text-amber-700 shrink-0">No input</span>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}

      {playbackUrl && !recording && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Playback</p>
          <PassageRecordingAudio
            src={playbackUrl}
            durationSeconds={displayDuration}
            onError={() =>
              setPlaybackError("Could not play this recording. Try re-recording.")
            }
          />
          {playbackError && (
            <p className="mt-2 text-xs text-rose-700">{playbackError}</p>
          )}
        </div>
      )}
    </div>
  );
}
