-- PDF practice system (additive only)

CREATE TYPE "PdfIngestionStatus" AS ENUM (
  'uploaded',
  'rendering_pages',
  'extracting_text',
  'detecting_problem_regions',
  'cropping_problem_images',
  'parsing_problems',
  'parsing_answer_key',
  'matching_answers',
  'classifying_concepts',
  'generating_explanations',
  'needs_review',
  'completed',
  'failed'
);

CREATE TYPE "PdfQuestionType" AS ENUM (
  'multiple_choice',
  'short_answer',
  'open_response',
  'multi_part',
  'visual_multiple_choice',
  'unknown'
);

CREATE TYPE "PdfStudentDisplayMode" AS ENUM (
  'image_crop',
  'full_page_with_problem_number',
  'text_rendered_admin_approved'
);

CREATE TYPE "PdfParseStatus" AS ENUM ('pending', 'parsed', 'partial', 'failed');

CREATE TYPE "PdfReviewStatus" AS ENUM ('needs_review', 'approved', 'rejected');

CREATE TYPE "PdfExplanationGenerationStatus" AS ENUM (
  'not_started',
  'generated',
  'needs_image_review',
  'answer_conflict_needs_review',
  'failed',
  'needs_human_review'
);

CREATE TYPE "PdfClassificationMethod" AS ENUM ('ai', 'keyword', 'admin_override');

CREATE TABLE "PdfSourceDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalFilePath" TEXT NOT NULL,
  "sha256Hash" TEXT NOT NULL,
  "pageCount" INTEGER NOT NULL DEFAULT 0,
  "gradeLevel" INTEGER,
  "subject" TEXT,
  "jurisdiction" TEXT,
  "sourceName" TEXT,
  "sourceUrl" TEXT,
  "sourceType" TEXT,
  "licenseNotes" TEXT,
  "importStatus" "PdfIngestionStatus" NOT NULL DEFAULT 'uploaded',
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfSourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfSourceDocument_sha256Hash_key" ON "PdfSourceDocument"("sha256Hash");
CREATE INDEX "PdfSourceDocument_importStatus_idx" ON "PdfSourceDocument"("importStatus");

CREATE TABLE "PdfIngestionJob" (
  "id" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "status" "PdfIngestionStatus" NOT NULL DEFAULT 'uploaded',
  "currentStep" TEXT,
  "progressPercent" INTEGER,
  "totalPages" INTEGER,
  "totalProblemsDetected" INTEGER,
  "totalAnswerKeyEntriesDetected" INTEGER,
  "totalAnswersMatched" INTEGER,
  "totalProblemsClassified" INTEGER,
  "totalExplanationsGenerated" INTEGER,
  "totalProblemsNeedingReview" INTEGER,
  "errorMessage" TEXT,
  "logs" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PdfIngestionJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PdfIngestionJob_sourceDocumentId_status_idx" ON "PdfIngestionJob"("sourceDocumentId", "status");

CREATE TABLE "PdfPage" (
  "id" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "textRaw" TEXT,
  "imagePath" TEXT NOT NULL,
  "imageWidth" INTEGER,
  "imageHeight" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PdfPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfPage_sourceDocumentId_pageNumber_key" ON "PdfPage"("sourceDocumentId", "pageNumber");

CREATE TABLE "PracticeConcept" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "gradeLevel" INTEGER,
  "domain" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "parentConceptId" TEXT,
  "description" TEXT,
  "sortOrder" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeConcept_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeConcept_slug_key" ON "PracticeConcept"("slug");
CREATE INDEX "PracticeConcept_subject_gradeLevel_domain_idx" ON "PracticeConcept"("subject", "gradeLevel", "domain");

CREATE TABLE "PdfPracticeProblem" (
  "id" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "problemNumber" INTEGER NOT NULL,
  "sourcePageStart" INTEGER NOT NULL,
  "sourcePageEnd" INTEGER,
  "rawText" TEXT,
  "cleanedText" TEXT,
  "questionType" "PdfQuestionType" NOT NULL DEFAULT 'unknown',
  "answerFormat" TEXT,
  "gradeLevel" INTEGER,
  "subject" TEXT,
  "primaryConceptId" TEXT,
  "topic" TEXT,
  "subtopic" TEXT,
  "standardGuess" TEXT,
  "difficultyGuess" TEXT,
  "requiresImage" BOOLEAN NOT NULL DEFAULT true,
  "studentDisplayMode" "PdfStudentDisplayMode" NOT NULL DEFAULT 'image_crop',
  "problemImagePath" TEXT,
  "fullPageImagePath" TEXT,
  "cropX" INTEGER,
  "cropY" INTEGER,
  "cropWidth" INTEGER,
  "cropHeight" INTEGER,
  "extractionConfidence" DOUBLE PRECISION,
  "answerKeyConfidence" DOUBLE PRECISION,
  "conceptConfidence" DOUBLE PRECISION,
  "explanationConfidence" DOUBLE PRECISION,
  "parseStatus" "PdfParseStatus" NOT NULL DEFAULT 'pending',
  "reviewStatus" "PdfReviewStatus" NOT NULL DEFAULT 'needs_review',
  "approvedForStudentUse" BOOLEAN NOT NULL DEFAULT false,
  "parseWarnings" JSONB,
  "contentHash" TEXT,
  "duplicateGroupId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfPracticeProblem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfPracticeProblem_sourceDocumentId_problemNumber_key" ON "PdfPracticeProblem"("sourceDocumentId", "problemNumber");
CREATE INDEX "PdfPracticeProblem_approvedForStudentUse_primaryConceptId_idx" ON "PdfPracticeProblem"("approvedForStudentUse", "primaryConceptId");
CREATE INDEX "PdfPracticeProblem_reviewStatus_idx" ON "PdfPracticeProblem"("reviewStatus");

CREATE TABLE "PdfAnswerChoice" (
  "id" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "text" TEXT,
  "imagePath" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfAnswerChoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfAnswerChoice_problemId_label_key" ON "PdfAnswerChoice"("problemId", "label");

CREATE TABLE "PdfAnswerKeyEntry" (
  "id" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "problemNumber" INTEGER NOT NULL,
  "rawAnswerText" TEXT NOT NULL,
  "correctChoiceLabel" TEXT,
  "correctAnswerText" TEXT,
  "points" DOUBLE PRECISION,
  "rubricText" TEXT,
  "sourcePageNumber" INTEGER,
  "extractionConfidence" DOUBLE PRECISION,
  "warnings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfAnswerKeyEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfAnswerKeyEntry_sourceDocumentId_problemNumber_key" ON "PdfAnswerKeyEntry"("sourceDocumentId", "problemNumber");

CREATE TABLE "PdfProblemSolution" (
  "id" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "answerKeyEntryId" TEXT,
  "correctChoiceLabel" TEXT,
  "correctAnswerText" TEXT,
  "explanationShort" TEXT,
  "explanationStepByStep" TEXT,
  "childFriendlyExplanation" TEXT,
  "commonMistakes" JSONB,
  "prerequisiteSkills" JSONB,
  "estimatedTimeSeconds" INTEGER,
  "generatedByModel" TEXT,
  "generationStatus" "PdfExplanationGenerationStatus" NOT NULL DEFAULT 'not_started',
  "confidence" DOUBLE PRECISION,
  "reviewedByAdminId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfProblemSolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfProblemSolution_problemId_key" ON "PdfProblemSolution"("problemId");

CREATE TABLE "PdfProblemConcept" (
  "id" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "confidence" DOUBLE PRECISION,
  "classificationMethod" "PdfClassificationMethod" NOT NULL DEFAULT 'ai',
  "reasoning" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfProblemConcept_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PdfProblemConcept_problemId_conceptId_key" ON "PdfProblemConcept"("problemId", "conceptId");

CREATE TABLE "PdfProblemAttempt" (
  "id" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "userId" TEXT,
  "studentProfileId" TEXT,
  "selectedChoiceLabel" TEXT,
  "freeResponseText" TEXT,
  "isCorrect" BOOLEAN,
  "timeSpentSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PdfProblemAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PdfProblemAttempt_problemId_createdAt_idx" ON "PdfProblemAttempt"("problemId", "createdAt");
CREATE INDEX "PdfProblemAttempt_studentProfileId_idx" ON "PdfProblemAttempt"("studentProfileId");

ALTER TABLE "PdfSourceDocument" ADD CONSTRAINT "PdfSourceDocument_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdfIngestionJob" ADD CONSTRAINT "PdfIngestionJob_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "PdfSourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfPage" ADD CONSTRAINT "PdfPage_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "PdfSourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeConcept" ADD CONSTRAINT "PracticeConcept_parentConceptId_fkey" FOREIGN KEY ("parentConceptId") REFERENCES "PracticeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdfPracticeProblem" ADD CONSTRAINT "PdfPracticeProblem_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "PdfSourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfPracticeProblem" ADD CONSTRAINT "PdfPracticeProblem_primaryConceptId_fkey" FOREIGN KEY ("primaryConceptId") REFERENCES "PracticeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdfAnswerChoice" ADD CONSTRAINT "PdfAnswerChoice_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "PdfPracticeProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfAnswerKeyEntry" ADD CONSTRAINT "PdfAnswerKeyEntry_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "PdfSourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfProblemSolution" ADD CONSTRAINT "PdfProblemSolution_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "PdfPracticeProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfProblemSolution" ADD CONSTRAINT "PdfProblemSolution_answerKeyEntryId_fkey" FOREIGN KEY ("answerKeyEntryId") REFERENCES "PdfAnswerKeyEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdfProblemSolution" ADD CONSTRAINT "PdfProblemSolution_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdfProblemConcept" ADD CONSTRAINT "PdfProblemConcept_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "PdfPracticeProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfProblemConcept" ADD CONSTRAINT "PdfProblemConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "PracticeConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfProblemAttempt" ADD CONSTRAINT "PdfProblemAttempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "PdfPracticeProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
