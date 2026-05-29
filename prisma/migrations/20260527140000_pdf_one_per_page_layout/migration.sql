-- CreateEnum
CREATE TYPE "PdfIngestionLayout" AS ENUM ('one_problem_per_page', 'auto_detect');

-- AlterTable
ALTER TABLE "PdfSourceDocument" ADD COLUMN "ingestionLayout" "PdfIngestionLayout" NOT NULL DEFAULT 'one_problem_per_page';
ALTER TABLE "PdfSourceDocument" ADD COLUMN "answerKeyPageCount" INTEGER NOT NULL DEFAULT 9;
