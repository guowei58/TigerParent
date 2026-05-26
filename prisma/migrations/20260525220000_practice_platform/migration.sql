-- Practice platform: assignments, mistake logs, readiness scores, extended sources

-- Extend SessionType
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'POP_QUIZ';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'HOMEWORK';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'DRILL';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'QUIZ';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'TEST';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'BENCHMARK';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'RETAKE';
ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS 'CHALLENGE';

-- Extend ContentSourceRegistryType
ALTER TYPE "ContentSourceRegistryType" ADD VALUE IF NOT EXISTS 'OFFICIAL_LINKED';
ALTER TYPE "ContentSourceRegistryType" ADD VALUE IF NOT EXISTS 'PARENT_PRIVATE_UPLOAD';
ALTER TYPE "ContentSourceRegistryType" ADD VALUE IF NOT EXISTS 'AI_GENERATED';

-- Extend ProblemUsageType
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'HOMEWORK';
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'QUIZ';
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'TEST';
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'RETAKE';
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'BENCHMARK';
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'SAT_PRACTICE';
ALTER TYPE "ProblemUsageType" ADD VALUE IF NOT EXISTS 'SCHOOL_TEST_PREP';

-- New enums (idempotent)
DO $$ BEGIN CREATE TYPE "ContentImportMode" AS ENUM ('FULL_IMPORT_ALLOWED', 'LINK_ONLY', 'METADATA_ONLY', 'PRIVATE_UPLOAD_ONLY', 'BLOCKED', 'NEEDS_REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ContentDisplayMode" AS ENUM ('FULL_IN_APP', 'LINK_OUT', 'METADATA_ONLY', 'PRIVATE_ONLY', 'BLOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SourceDocumentType" AS ENUM ('RELEASED_TEST', 'ANSWER_KEY', 'RATIONALE', 'SCORING_GUIDE', 'CURRICULUM_LESSON', 'WORKSHEET', 'QUESTION_BANK', 'STANDARD_DOCUMENT', 'PRIVATE_UPLOAD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentParseStatus" AS ENUM ('NOT_PARSED', 'PARSED', 'FAILED', 'NEEDS_REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentRightsStatus" AS ENUM ('FULL_IMPORT_ALLOWED', 'LINK_ONLY', 'METADATA_ONLY', 'PRIVATE_ONLY', 'BLOCKED', 'NEEDS_REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'DRILL', 'QUIZ', 'TEST', 'BENCHMARK', 'RETAKE', 'CHALLENGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'OVERDUE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MistakeType" AS ENUM ('CARELESS', 'CONCEPTUAL', 'PROCEDURAL', 'COMPREHENSION', 'SPEED', 'GUESSING', 'UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TestType" AS ENUM ('QUIZ', 'UNIT_TEST', 'BENCHMARK', 'STAAR_STYLE', 'SAT_STYLE', 'MIXED_REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReadinessConfidenceBand" AS ENUM ('NEEDS_FOUNDATION', 'APPROACHING_GRADE_LEVEL', 'ON_GRADE_LEVEL', 'AHEAD', 'STRONG', 'ADVANCED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SatFoundationBand" AS ENUM ('FOUNDATION_BUILDING', 'EARLY_SAT_FOUNDATION', 'DEVELOPING_SAT_READINESS', 'STRONG_SAT_FOUNDATION', 'OFFICIAL_SAT_PREP_READY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ContentStrictnessMode" AS ENUM ('STRICT_TEST', 'BALANCED_PRACTICE', 'DRILL_MODE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExtractionStatus" AS ENUM ('NOT_STARTED', 'EXTRACTED', 'NEEDS_REVIEW', 'APPROVED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- StudentSettings
ALTER TABLE "StudentSettings" ADD COLUMN IF NOT EXISTS "contentStrictness" "ContentStrictnessMode" NOT NULL DEFAULT 'BALANCED_PRACTICE';

-- ContentSource extensions
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "shortName" TEXT;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "licenseName" TEXT;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "attributionText" TEXT;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "canStoreFullText" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "canDisplayToStudents" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "canModify" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "canRedistribute" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "importStatus" "ContentImportMode" NOT NULL DEFAULT 'NEEDS_REVIEW';
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "ContentSource" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Problem extensions
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "passage" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "itemRationale" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "answerKey" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "scoringRubricJson" JSONB;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "displayMode" "ContentDisplayMode" NOT NULL DEFAULT 'FULL_IN_APP';
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "teksCode" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "commonCoreCode" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "satDomain" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "satSkill" TEXT;
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "sourceDocumentId" TEXT;

-- PracticeSession extensions
ALTER TABLE "PracticeSession" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
ALTER TABLE "PracticeSession" ADD COLUMN IF NOT EXISTS "timed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PracticeSession" ADD COLUMN IF NOT EXISTS "timeLimitSeconds" INTEGER;

-- Attempt extensions
ALTER TABLE "Attempt" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN IF NOT EXISTS "mistakeType" "MistakeType";
ALTER TABLE "Attempt" ADD COLUMN IF NOT EXISTS "confidenceSelfRating" INTEGER;

CREATE TABLE IF NOT EXISTS "SourceDocument" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" "SourceDocumentType" NOT NULL,
    "year" INTEGER,
    "gradeLevel" INTEGER,
    "subject" TEXT,
    "url" TEXT,
    "localFilePath" TEXT,
    "checksum" TEXT,
    "parseStatus" "DocumentParseStatus" NOT NULL DEFAULT 'NOT_PARSED',
    "rightsStatus" "DocumentRightsStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Assignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT,
    "gradeLevel" INTEGER,
    "skillIdsJson" JSONB NOT NULL DEFAULT '[]',
    "standardCodesJson" JSONB NOT NULL DEFAULT '[]',
    "problemIdsJson" JSONB NOT NULL DEFAULT '[]',
    "dueDate" TIMESTAMP(3),
    "targetMinutes" INTEGER NOT NULL DEFAULT 15,
    "timed" BOOLEAN NOT NULL DEFAULT false,
    "timeLimitSeconds" INTEGER,
    "sourceMixJson" JSONB,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MistakeLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "attemptId" TEXT,
    "skillId" TEXT,
    "standardCode" TEXT,
    "mistakeType" "MistakeType" NOT NULL DEFAULT 'UNKNOWN',
    "studentAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "needsRetake" BOOLEAN NOT NULL DEFAULT true,
    "retakeScheduledAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MistakeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "testType" "TestType" NOT NULL,
    "rawScore" INTEGER NOT NULL,
    "percentScore" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "medianSeconds" DOUBLE PRECISION,
    "standardBreakdownJson" JSONB,
    "skillBreakdownJson" JSONB,
    "sourceMixJson" JSONB,
    "weakAreasJson" JSONB,
    "readinessBand" "ReadinessConfidenceBand",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolUnit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT,
    "gradeLevel" INTEGER,
    "teacherProvided" BOOLEAN NOT NULL DEFAULT false,
    "testDate" TIMESTAMP(3),
    "uploadedStudyGuideId" TEXT,
    "standardsJson" JSONB NOT NULL DEFAULT '[]',
    "skillsJson" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PrivateMaterialVault" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "contentSourceId" TEXT,
    "title" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sourceDescription" TEXT,
    "gradeLevel" INTEGER,
    "subject" TEXT,
    "unit" TEXT,
    "skillTagsJson" JSONB NOT NULL DEFAULT '[]',
    "hasAnswerKey" BOOLEAN NOT NULL DEFAULT false,
    "answerKeyPath" TEXT,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "visibility" TEXT NOT NULL DEFAULT 'FAMILY_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateMaterialVault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolReadinessScore" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "standardsMastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "homeworkPerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quizPerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "benchmarkPerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fluencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retentionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceBackedCoverageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weakAreasJson" JSONB NOT NULL DEFAULT '[]',
    "confidenceBand" "ReadinessConfidenceBand" NOT NULL DEFAULT 'NEEDS_FOUNDATION',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolReadinessScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SATFoundationScore" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mathFoundation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readingFoundation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grammarFoundation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "problemSolving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retention" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "officialPracticePerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "domainWeaknessesJson" JSONB NOT NULL DEFAULT '[]',
    "confidenceBand" "SatFoundationBand" NOT NULL DEFAULT 'FOUNDATION_BUILDING',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SATFoundationScore_pkey" PRIMARY KEY ("id")
);

-- Indexes and FKs
CREATE UNIQUE INDEX IF NOT EXISTS "PracticeSession_assignmentId_key" ON "PracticeSession"("assignmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "MistakeLog_attemptId_key" ON "MistakeLog"("attemptId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolReadinessScore_studentId_subjectId_key" ON "SchoolReadinessScore"("studentId", "subjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "SATFoundationScore_studentId_key" ON "SATFoundationScore"("studentId");
CREATE INDEX IF NOT EXISTS "SourceDocument_sourceId_documentType_idx" ON "SourceDocument"("sourceId", "documentType");
CREATE INDEX IF NOT EXISTS "Assignment_studentId_status_idx" ON "Assignment"("studentId", "status");
CREATE INDEX IF NOT EXISTS "Assignment_studentId_assignmentType_createdAt_idx" ON "Assignment"("studentId", "assignmentType", "createdAt");
CREATE INDEX IF NOT EXISTS "MistakeLog_studentId_needsRetake_idx" ON "MistakeLog"("studentId", "needsRetake");
CREATE INDEX IF NOT EXISTS "MistakeLog_studentId_skillId_idx" ON "MistakeLog"("studentId", "skillId");
CREATE INDEX IF NOT EXISTS "TestResult_studentId_createdAt_idx" ON "TestResult"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "SchoolUnit_studentId_testDate_idx" ON "SchoolUnit"("studentId", "testDate");
CREATE INDEX IF NOT EXISTS "PrivateMaterialVault_familyId_idx" ON "PrivateMaterialVault"("familyId");

DO $$ BEGIN
  ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Problem" ADD CONSTRAINT "Problem_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MistakeLog" ADD CONSTRAINT "MistakeLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MistakeLog" ADD CONSTRAINT "MistakeLog_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MistakeLog" ADD CONSTRAINT "MistakeLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MistakeLog" ADD CONSTRAINT "MistakeLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SchoolUnit" ADD CONSTRAINT "SchoolUnit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PrivateMaterialVault" ADD CONSTRAINT "PrivateMaterialVault_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PrivateMaterialVault" ADD CONSTRAINT "PrivateMaterialVault_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PrivateMaterialVault" ADD CONSTRAINT "PrivateMaterialVault_contentSourceId_fkey" FOREIGN KEY ("contentSourceId") REFERENCES "ContentSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SchoolReadinessScore" ADD CONSTRAINT "SchoolReadinessScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SATFoundationScore" ADD CONSTRAINT "SATFoundationScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
