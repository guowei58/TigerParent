-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'MAGIC_LINK', 'STUDENT_INVITE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_token_key" ON "AuthToken"("token");

-- CreateIndex
CREATE INDEX "AuthToken_email_type_idx" ON "AuthToken"("email", "type");
