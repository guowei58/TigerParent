import "dotenv/config";
import { prisma } from "../src/lib/db";
import { reparseAndSyncAnswerKeys } from "../src/lib/pdf/syncSolutionsFromAnswerKeys";

const docId = process.argv[2];

async function main() {
  if (!docId) {
    console.error("Usage: reparse-answer-keys.ts <sourceDocumentId>");
    process.exit(1);
  }

  const result = await reparseAndSyncAnswerKeys(docId);
  console.log(result);
}

main().finally(() => prisma.$disconnect());
