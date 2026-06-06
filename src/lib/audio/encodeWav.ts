/** Encode mono float samples as 16-bit PCM WAV. */
export function encodeWavBlob(chunks: Float32Array[], sampleRate: number): Blob {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const buffer = new ArrayBuffer(44 + merged.length * 2);
  const view = new DataView(buffer);

  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + merged.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, merged.length * 2, true);

  let idx = 44;
  for (let i = 0; i < merged.length; i++) {
    const s = Math.max(-1, Math.min(1, merged[i]!));
    view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    idx += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function wavBytesPerSecond(sampleRate = 44100): number {
  return sampleRate * 2;
}
