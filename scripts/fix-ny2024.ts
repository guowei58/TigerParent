import "dotenv/config";
import { prisma } from "../src/lib/db";
import { reparseAndSyncAnswerKeys } from "../src/lib/pdf/syncSolutionsFromAnswerKeys";

const docId = "cmppukphe0018skvmg3dmpy7z";

async function main() {
  console.log("Reparse answer keys + sync types/solutions…");
  const result = await reparseAndSyncAnswerKeys(docId);
  console.log(result);
}

main().finally(() => prisma.$disconnect());
