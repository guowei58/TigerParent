/**
 * Discover, download, import, and gap-fill until all 51 jurisdictions have items.
 * Usage: npm run db:ensure-all-states
 */
import { downloadStateReleases } from "./download";
import {
  alignStandards,
  countOfficialByJurisdiction,
  fillMissingStates,
  importFromManifest,
  seedStateSources,
} from "./import-all-helpers";
import { STATE_SOURCES } from "./catalog";
import { prisma } from "@/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const importOnly = args.includes("--import-only");
  const skipDownload = args.includes("--skip-download") || importOnly;

  console.log("=== Ensure All 51 States Have Assessment Items ===\n");

  await seedStateSources();

  if (!skipDownload) {
    console.log("--- Phase 1: Discover + download all state PDFs ---");
    await downloadStateReleases();
  } else {
    console.log("--- Phase 1: Skipped download (--skip-download / --import-only) ---");
  }

  console.log("\n--- Phase 2: Parse + import downloaded PDFs ---");
  await importFromManifest();

  console.log("\n--- Phase 3: Gap-fill states still at zero ---");
  const gap = await fillMissingStates();

  console.log("\n--- Phase 4: Align standards ---");
  await alignStandards();

  const counts = await countOfficialByJurisdiction();
  const withItems = STATE_SOURCES.filter((s) => (counts.get(s.stateCode) ?? 0) > 0);

  console.log(`\n=== Final coverage: ${withItems.length}/51 states ===`);
  for (const s of STATE_SOURCES.sort((a, b) => a.stateCode.localeCompare(b.stateCode))) {
    const n = counts.get(s.stateCode) ?? 0;
    if (n > 0) console.log(`  ${s.stateCode}: ${n}`);
  }

  const stillMissing = STATE_SOURCES.filter((s) => (counts.get(s.stateCode) ?? 0) === 0);
  if (stillMissing.length) {
    console.log(`\nStill missing: ${stillMissing.map((s) => s.stateCode).join(", ")}`);
    process.exit(1);
  }

  console.log(`\nGap-filled ${gap.filled} states: ${gap.states.join(", ")}`);
  console.log("\nRun: npm run db:report-state-coverage");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
