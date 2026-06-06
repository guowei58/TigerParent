import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { resolveDataPath } from "@/lib/storage/fileStorage";
import {
  passageRecordingAudioUrl,
  type DailyPassageRecording,
} from "@/lib/passage-recording";

export type { DailyPassageRecording };

export async function canStreamRecording(
  recordingId: string,
  studentProfileId: string | null | undefined,
  role: string | undefined,
) {
  const recording = await prisma.passageReadingRecording.findUnique({
    where: { id: recordingId },
    select: { studentProfileId: true, storagePath: true, mimeType: true },
  });
  if (!recording) return null;
  if (role === "ADMIN" || recording.studentProfileId === studentProfileId) {
    return recording;
  }
  return null;
}

export function readRecordingFile(storagePath: string): Buffer | null {
  const filePath = resolveDataPath(storagePath);
  const root = path.join(process.cwd(), "data").replace(/\\/g, "/");
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  if (!normalized.toLowerCase().startsWith(root.toLowerCase())) return null;
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function passageTitleFromRow(passage: {
  title: string | null;
  promptText: string | null;
  passageNumber: number;
}): string {
  return (
    passage.title?.trim() ||
    passage.promptText?.trim().slice(0, 80) ||
    `Passage ${passage.passageNumber}`
  );
}

function mapPassageRecordingRow(row: {
  id: string;
  passageId: string;
  durationSeconds: number | null;
  updatedAt: Date;
  passage: {
    title: string | null;
    promptText: string | null;
    passageNumber: number;
  };
}): DailyPassageRecording {
  return {
    id: row.id,
    passageId: row.passageId,
    passageTitle: passageTitleFromRow(row.passage),
    durationSeconds: row.durationSeconds,
    recordedAt: row.updatedAt,
    audioUrl: passageRecordingAudioUrl(row.id),
  };
}

export async function getPassageRecordingsForPassageIds(
  studentProfileId: string,
  passageIds: string[],
): Promise<DailyPassageRecording[]> {
  if (passageIds.length === 0) return [];

  const rows = await prisma.passageReadingRecording.findMany({
    where: {
      studentProfileId,
      passageId: { in: passageIds },
    },
    include: {
      passage: { select: { title: true, promptText: true, passageNumber: true } },
    },
  });

  return rows.map(mapPassageRecordingRow);
}

export async function getPassageRecordingsForDay(
  studentProfileId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<DailyPassageRecording[]> {
  const rows = await prisma.passageReadingRecording.findMany({
    where: {
      studentProfileId,
      updatedAt: { gte: dayStart, lt: dayEnd },
    },
    include: {
      passage: { select: { title: true, promptText: true, passageNumber: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  return rows.map(mapPassageRecordingRow);
}
