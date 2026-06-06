-- ELA reading passages support (idempotent)
DO $$ BEGIN
  ALTER TYPE "PdfIngestionLayout" ADD VALUE IF NOT EXISTS 'ela_reading_passages';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PdfReadingPassage" (
  "id" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "passageNumber" INTEGER NOT NULL,
  "title" TEXT,
  "promptText" TEXT,
  "bodyText" TEXT,
  "pageStart" INTEGER NOT NULL,
  "pageEnd" INTEGER NOT NULL,
  "pageImagePaths" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PdfReadingPassage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PdfReadingPassage_sourceDocumentId_passageNumber_key"
  ON "PdfReadingPassage"("sourceDocumentId", "passageNumber");
CREATE INDEX IF NOT EXISTS "PdfReadingPassage_sourceDocumentId_idx"
  ON "PdfReadingPassage"("sourceDocumentId");

DO $$ BEGIN
  ALTER TABLE "PdfReadingPassage"
    ADD CONSTRAINT "PdfReadingPassage_sourceDocumentId_fkey"
    FOREIGN KEY ("sourceDocumentId") REFERENCES "PdfSourceDocument"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "PdfPracticeProblem" ADD COLUMN IF NOT EXISTS "passageId" TEXT;

CREATE INDEX IF NOT EXISTS "PdfPracticeProblem_passageId_idx"
  ON "PdfPracticeProblem"("passageId");

DO $$ BEGIN
  ALTER TABLE "PdfPracticeProblem"
    ADD CONSTRAINT "PdfPracticeProblem_passageId_fkey"
    FOREIGN KEY ("passageId") REFERENCES "PdfReadingPassage"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
