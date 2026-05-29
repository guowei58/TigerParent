/**
 * Seed sources + gap-fill until all 51 jurisdictions have official items.
 * Skips slow discover/download — use after import or when portals block PDFs.
 * Usage: npm run db:gap-fill-states
 */
import {
  alignStandards,
  countOfficialByJurisdiction,
  fillMissingStates,
  seedStateSources,
} from "./import-all-helpers";
import { STATE_SOURCES } from "./catalog";
import { prisma } from "@/lib/db";

async function main() {
  console.log("=== Gap-fill missing states (51 jurisdictions) ===\n");
  await seedStateSources();

  const before = await countOfficialByJurisdiction();
  const missingBefore = STATE_SOURCES.filter((s) => (before.get(s.stateCode) ?? 0) === 0);
  console.log(`Before: ${STATE_SOURCES.length - missingBefore.length}/51 with items`);
  if (missingBefore.length) {
    console.log(`  Missing: ${missingBefore.map((s) => s.stateCode).join(", ")}\n`);
  }

  const gap = await fillMissingStates();
  await alignStandards();

  const counts = await countOfficialByJurisdiction();
  const withItems = STATE_SOURCES.filter((s) => (counts.get(s.stateCode) ?? 0) > 0);
  const stillMissing = STATE_SOURCES.filter((s) => (counts.get(s.stateCode) ?? 0) === 0);

  console.log(`\n=== After gap-fill: ${withItems.length}/51 states ===`);
  if (stillMissing.length) {
    console.log(`Still missing: ${stillMissing.map((s) => s.stateCode).join(", ")}`);
    process.exit(1);
  }

  console.log(`Filled ${gap.filled} states: ${gap.states.join(", ")}`);
  console.log("\nRun: npm run db:report-state-coverage");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
