/**
 * Download + import state released assessment items (all configured states/years).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/state-releases/import-all.ts
 *   npx tsx --env-file=.env scripts/state-releases/import-all.ts --download-only
 *   npx tsx --env-file=.env scripts/state-releases/import-all.ts --state NY
 */
import { prisma } from "@/lib/db";
import { downloadStateReleases } from "./download";
import {
  alignStandards,
  importFromManifest,
  seedStateSources,
} from "./import-all-helpers";

async function main() {
  const args = process.argv.slice(2);
  const downloadOnly = args.includes("--download-only");
  const importOnly = args.includes("--import-only");
  const stateArg = args.find((a) => a.startsWith("--state="));
  const stateFilter = stateArg?.split("=")[1]?.toUpperCase();

  console.log("=== State Release Repository Builder ===\n");
  await seedStateSources();

  if (!importOnly) {
    console.log("\n--- Phase 1: Download ---");
    await downloadStateReleases({ stateCode: stateFilter });
  }

  if (!downloadOnly) {
    console.log("\n--- Phase 2: Parse + Import ---");
    const totals = await importFromManifest(stateFilter);

    console.log("\n--- Phase 3: Align standards ---");
    const alignCount = await alignStandards();
    console.log(`  ${alignCount} alignments`);

    console.log("\n=== Import Totals ===");
    let grandParsed = 0;
    let grandImported = 0;
    for (const [source, t] of Object.entries(totals)) {
      console.log(`  ${source}: ${t.imported} imported (${t.parsed} parsed, ${t.skipped} skipped)`);
      grandParsed += t.parsed;
      grandImported += t.imported;
    }
    console.log(`\n  TOTAL: ${grandImported} NEW items imported (${grandParsed} parsed from PDFs)`);
    if (grandImported === 0 && grandParsed > 0) {
      console.log(
        "\n  Note: 0 new usually means MA/NY/TX are already imported. Other states need parsers that match their PDF format.",
      );
    }
    console.log("\nRun: npm run db:report-state-coverage");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
