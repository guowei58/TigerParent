/**
 * Discover downloadable PDF URLs from state portals (no download).
 */
import fs from "fs";
import path from "path";
import { countTargetsByState, generateDownloadTargets } from "./catalog";
import { discoverAllTargets, mergeTargets } from "./scrapers/index";

async function main() {
  console.log("=== State Release URL Discovery ===\n");

  const staticTargets = generateDownloadTargets();
  const discovered = await discoverAllTargets();
  const merged = mergeTargets(staticTargets, discovered);

  console.log(`\nStatic catalog: ${staticTargets.length}`);
  console.log(`Discovered:     ${discovered.length}`);
  console.log(`Merged total:   ${merged.length}`);

  const byState = countTargetsByState(merged);
  for (const [state, count] of [...byState.entries()].sort()) {
    console.log(`  ${state}: ${count}`);
  }

  const outDir = path.join("data", "state-releases");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "discovered-targets.json"),
    JSON.stringify(merged, null, 2),
  );
  console.log(`\nWrote data/state-releases/discovered-targets.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
