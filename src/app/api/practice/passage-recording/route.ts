import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  deletePassageRecordingFile,
  savePassageRecordingFile,
} from "@/lib/storage/fileStorage";
import { passageRecordingAudioUrl } from "@/lib/passage-recording";
import { readRecordingFile } from "@/lib/passage-recording.server";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_DURATION_SECONDS = 600;

async function requireStudentProfileId() {
  const session = await auth();
  if (session?.user.role !== "STUDENT" && session?.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const studentProfileId = session.user.studentProfileId;
  if (!studentProfileId) {
    return { error: NextResponse.json({ error: "Student profile required" }, { status: 403 }) };
  }
  return { studentProfileId };
}

export async function GET(request: Request) {
  const authResult = await requireStudentProfileId();
  if ("error" in authResult) return authResult.error;

  const passageId = new URL(request.url).searchParams.get("passageId");
  if (!passageId) {
    return NextResponse.json({ error: "passageId required" }, { status: 400 });
  }

  const recording = await prisma.passageReadingRecording.findUnique({
    where: {
      passageId_studentProfileId: {
        passageId,
        studentProfileId: authResult.studentProfileId,
      },
    },
  });

  if (!recording) {
    return NextResponse.json({ recording: null });
  }

  return NextResponse.json({
    recording: {
      id: recording.id,
      passageId: recording.passageId,
      durationSeconds: recording.durationSeconds,
      recordedAt: recording.updatedAt.toISOString(),
      audioUrl: passageRecordingAudioUrl(recording.id),
      fileBytes: readRecordingFile(recording.storagePath)?.length ?? 0,
    },
  });
}

export async function POST(request: Request) {
  const authResult = await requireStudentProfileId();
  if ("error" in authResult) return authResult.error;

  const form = await request.formData();
  const passageId = String(form.get("passageId") ?? "").trim();
  const durationRaw = form.get("durationSeconds");
  const audio = form.get("audio");

  if (!passageId) {
    return NextResponse.json({ error: "passageId required" }, { status: 400 });
  }
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is too large (max 15 MB)." }, { status: 413 });
  }

  const durationSeconds = durationRaw != null ? Math.round(Number(durationRaw)) : null;
  if (
    durationSeconds != null &&
    (!Number.isFinite(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > MAX_DURATION_SECONDS)
  ) {
    return NextResponse.json({ error: "Invalid recording duration." }, { status: 400 });
  }

  const passage = await prisma.pdfReadingPassage.findFirst({
    where: {
      id: passageId,
      problems: {
        some: { approvedForStudentUse: true, reviewStatus: "approved" },
      },
    },
    select: { id: true },
  });
  if (!passage) {
    return NextResponse.json({ error: "Passage not found" }, { status: 404 });
  }

  const mimeType = audio.type?.includes("wav")
    ? "audio/wav"
    : (audio.type || "audio/webm").split(";")[0]!.trim() || "audio/webm";
  const buffer = Buffer.from(await audio.arrayBuffer());

  if (buffer.length < 8000) {
    return NextResponse.json(
      {
        error:
          "Recording file is too small — the microphone may not have captured audio. Speak for at least 5 seconds and try again.",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.passageReadingRecording.findUnique({
    where: {
      passageId_studentProfileId: {
        passageId,
        studentProfileId: authResult.studentProfileId,
      },
    },
  });
  if (existing) {
    deletePassageRecordingFile(existing.storagePath);
  }

  const storagePath = savePassageRecordingFile(
    authResult.studentProfileId,
    passageId,
    buffer,
    mimeType,
  );

  const recording = await prisma.passageReadingRecording.upsert({
    where: {
      passageId_studentProfileId: {
        passageId,
        studentProfileId: authResult.studentProfileId,
      },
    },
    create: {
      passageId,
      studentProfileId: authResult.studentProfileId,
      storagePath,
      durationSeconds,
      mimeType,
    },
    update: {
      storagePath,
      durationSeconds,
      mimeType,
    },
  });

  return NextResponse.json({
    ok: true,
    recording: {
      id: recording.id,
      passageId: recording.passageId,
      durationSeconds: recording.durationSeconds,
      recordedAt: recording.updatedAt.toISOString(),
      audioUrl: passageRecordingAudioUrl(recording.id),
    },
  });
}
