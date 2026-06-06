import "dotenv/config";
import fs from "fs";
import { prisma } from "../src/lib/db";

async function main() {
  const sql = fs.readFileSync("prisma/migrations/manual_ela_passages.sql", "utf8");
  await prisma.$executeRawUnsafe(sql);
  console.log("ELA passage migration applied");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
