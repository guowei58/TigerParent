import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canStreamRecording, readRecordingFile } from "@/lib/passage-recording.server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordingId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordingId } = await params;
  const recording = await canStreamRecording(
    recordingId,
    session.user.studentProfileId,
    session.user.role,
  );
  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = readRecordingFile(recording.storagePath);
  if (!buf) {
    return NextResponse.json({ error: "Recording file missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": recording.mimeType.includes("wav")
        ? "audio/wav"
        : recording.mimeType.includes("webm")
          ? "audio/webm"
          : recording.mimeType.includes("mp4") ||
              recording.mimeType.includes("m4a") ||
              recording.mimeType.includes("aac")
            ? "audio/mp4"
            : recording.mimeType || "audio/mp4",
      "Content-Length": String(buf.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-cache",
    },
  });
}
