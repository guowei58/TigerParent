/** True for iPhone, iPad, and iPod touch browsers. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function pickMediaRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = isIOSDevice()
    ? [
        "audio/mp4",
        "audio/mp4;codecs=mp4a",
        "audio/aac",
        "audio/webm;codecs=opus",
        "audio/webm",
      ]
    : [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function recordingBlobType(mimeType: string): string {
  return mimeType.split(";")[0]!.trim() || "audio/webm";
}

export function recordingFileName(mimeType: string): string {
  const base = recordingBlobType(mimeType);
  if (base.includes("mp4") || base.includes("aac") || base.includes("m4a")) {
    return "reading.m4a";
  }
  if (base.includes("wav")) return "reading.wav";
  return "reading.webm";
}

export function recordingTimesliceMs(): number | undefined {
  // iOS Safari only reliably emits chunks with a timeslice.
  return isIOSDevice() ? 250 : undefined;
}

export async function waitForRecorderStop(recorder: MediaRecorder): Promise<void> {
  if (recorder.state === "inactive") return;
  await new Promise<void>((resolve) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    try {
      recorder.requestData();
    } catch {
      /* not supported on all browsers */
    }
    recorder.stop();
  });
  await new Promise((r) => setTimeout(r, isIOSDevice() ? 400 : 150));
}

export function micAccessErrorMessage(): string {
  if (isIOSDevice()) {
    return "Could not use the microphone. In Settings → Safari → Microphone, choose Allow, then reload and try again.";
  }
  return "Could not access the microphone. Allow mic access and pick the correct device below.";
}

export function noAudioCapturedMessage(): string {
  if (isIOSDevice()) {
    return "No audio captured. Allow microphone access for Safari, speak clearly for 5+ seconds, then try again.";
  }
  return "No audio captured. Try a different microphone from the list below.";
}

export function noVoiceDetectedMessage(): string {
  if (isIOSDevice()) {
    return "No voice detected. Hold the phone normally, speak louder, and record at least 5 seconds.";
  }
  return "No voice detected. Choose a different microphone below, check your sound settings, then try again.";
}
