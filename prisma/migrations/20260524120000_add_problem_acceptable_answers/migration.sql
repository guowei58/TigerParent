-- AlterTable
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "acceptableAnswersJson" JSONB;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "sourceAttribution" TEXT;
