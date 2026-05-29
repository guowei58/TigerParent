/**
 * Discover released-test PDFs from all 51 state/DC portals, then download + import.
 *
 * Usage:
 *   npm run db:find-all-state-problems
 *   npm run db:find-all-state-problems -- --discover-only
 */
import fs from "fs";
import path from "path";
import { generateDownloadTargets } from "./catalog";
import { discoverAllTargets, mergeTargets } from "./scrapers/index";

async function main() {
  const discoverOnly = process.argv.includes("--discover-only");

  console.log("=== Find Test Questions From All States ===\n");

  const discovered = await discoverAllTargets();
  const merged = mergeTargets(generateDownloadTargets(), discovered);

  const byState = new Map<string, number>();
  for (const t of merged) byState.set(t.stateCode, (byState.get(t.stateCode) ?? 0) + 1);

  console.log(`\nTotal discoverable PDF targets: ${merged.length}`);
  console.log(`States with at least one PDF URL: ${[...byState.values()].filter((n) => n > 0).length}\n`);

  for (const [st, n] of [...byState.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${st}: ${n} files`);
  }

  const outDir = path.join("data", "state-releases");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "all-states-targets.json"), JSON.stringify(merged, null, 2));
  console.log(`\nWrote data/state-releases/all-states-targets.json`);

  if (discoverOnly) {
    console.log("\nNext: npm run db:import-state-releases");
    return;
  }

  console.log("\nStarting download + import (npm run db:import-state-releases)...\n");
  const { execSync } = await import("child_process");
  execSync("npx tsx --env-file=.env scripts/state-releases/import-all.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
