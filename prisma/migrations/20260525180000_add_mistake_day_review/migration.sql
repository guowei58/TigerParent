-- CreateTable
CREATE TABLE "MistakeDayReview" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "mistakeDate" DATE NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MistakeDayReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MistakeDayReview_studentId_subjectId_idx" ON "MistakeDayReview"("studentId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "MistakeDayReview_studentId_subjectId_mistakeDate_key" ON "MistakeDayReview"("studentId", "subjectId", "mistakeDate");

-- AddForeignKey
ALTER TABLE "MistakeDayReview" ADD CONSTRAINT "MistakeDayReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeDayReview" ADD CONSTRAINT "MistakeDayReview_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
