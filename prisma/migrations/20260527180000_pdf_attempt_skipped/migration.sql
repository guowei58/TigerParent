-- AlterTable
ALTER TABLE "PdfProblemAttempt" ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PdfProblemAttempt_studentProfileId_problemId_idx" ON "PdfProblemAttempt"("studentProfileId", "problemId");
