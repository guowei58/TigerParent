-- Passage reading recordings (student audio per ELA passage)

CREATE TABLE "PassageReadingRecording" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/webm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassageReadingRecording_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PassageReadingRecording_passageId_studentProfileId_key" ON "PassageReadingRecording"("passageId", "studentProfileId");

CREATE INDEX "PassageReadingRecording_studentProfileId_updatedAt_idx" ON "PassageReadingRecording"("studentProfileId", "updatedAt");

ALTER TABLE "PassageReadingRecording" ADD CONSTRAINT "PassageReadingRecording_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "PdfReadingPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PassageReadingRecording" ADD CONSTRAINT "PassageReadingRecording_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
