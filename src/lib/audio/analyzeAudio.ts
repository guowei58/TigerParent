/** Peak amplitude 0–1 from recorded float samples. */
export function peakAmplitude(chunks: Float32Array[]): number {
  let peak = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      peak = Math.max(peak, Math.abs(chunk[i]!));
    }
  }
  return peak;
}

export async function peakAmplitudeFromBlob(blob: Blob): Promise<number> {
  try {
    const ctx = new AudioContext();
    const buf = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    await ctx.close();
    const data = decoded.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]!));
    }
    return peak;
  } catch {
    return 0;
  }
}
