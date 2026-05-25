-- AlterEnum
ALTER TYPE "SessionType" ADD VALUE 'POP_QUIZ';

-- CreateEnum
CREATE TYPE "PopQuizStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PopQuizAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT,
    "skillIdsJson" JSONB NOT NULL DEFAULT '[]',
    "problemCount" INTEGER NOT NULL DEFAULT 8,
    "status" "PopQuizStatus" NOT NULL DEFAULT 'PENDING',
    "sessionId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopQuizAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PopQuizAssignment_sessionId_key" ON "PopQuizAssignment"("sessionId");

-- CreateIndex
CREATE INDEX "PopQuizAssignment_studentId_status_idx" ON "PopQuizAssignment"("studentId", "status");

-- AddForeignKey
ALTER TABLE "PopQuizAssignment" ADD CONSTRAINT "PopQuizAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopQuizAssignment" ADD CONSTRAINT "PopQuizAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopQuizAssignment" ADD CONSTRAINT "PopQuizAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
