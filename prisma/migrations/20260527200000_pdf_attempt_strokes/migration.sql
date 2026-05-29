-- AlterTable
ALTER TABLE "PdfProblemAttempt" ADD COLUMN "showedWork" BOOLEAN,
ADD COLUMN "workQualityJson" JSONB;

-- CreateTable
CREATE TABLE "PdfAttemptStrokeSubmission" (
    "id" TEXT NOT NULL,
    "pdfProblemAttemptId" TEXT NOT NULL,
    "strokeDataJson" JSONB NOT NULL,
    "drawingSeconds" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfAttemptStrokeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdfAttemptStrokeSubmission_pdfProblemAttemptId_key" ON "PdfAttemptStrokeSubmission"("pdfProblemAttemptId");

-- AddForeignKey
ALTER TABLE "PdfAttemptStrokeSubmission" ADD CONSTRAINT "PdfAttemptStrokeSubmission_pdfProblemAttemptId_fkey" FOREIGN KEY ("pdfProblemAttemptId") REFERENCES "PdfProblemAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
