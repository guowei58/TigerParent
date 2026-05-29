import type { ReleaseDownloadTarget } from "../catalog";
import { STATE_SOURCES } from "../catalog";
import { scrapeAllPortalStates } from "./generic-portal";
import { scrapeAllStatesDeep } from "./deep-portal";
import { scrapeLouisianaLeapTargets } from "./louisiana-leap";
import { scrapeNysedTargets } from "./nysed";
import { scrapeTeaStaarTargets } from "./tea-staar";
import { scrapeVaSolTargets } from "./va-sol";

export async function discoverAllTargets(): Promise<ReleaseDownloadTarget[]> {
  const results: ReleaseDownloadTarget[] = [];

  console.log("  Discovering NYSED links from index pages...");
  try {
    const ny = await scrapeNysedTargets();
    console.log(`    NYSED: ${ny.length} PDFs`);
    results.push(...ny);
  } catch (e) {
    console.warn("    NYSED scrape failed:", (e as Error).message);
  }

  console.log("  Discovering TEA STAAR links from release page...");
  try {
    const tx = await scrapeTeaStaarTargets();
    console.log(`    TEA: ${tx.length} PDFs`);
    results.push(...tx);
  } catch (e) {
    console.warn("    TEA scrape failed:", (e as Error).message);
  }

  console.log("  Discovering VA SOL links...");
  try {
    const va = await scrapeVaSolTargets();
    console.log(`    VA: ${va.length} PDFs`);
    results.push(...va);
  } catch (e) {
    console.warn("    VA scrape failed:", (e as Error).message);
  }

  console.log("  Discovering Louisiana LEAP practice test PDFs...");
  try {
    const la = await scrapeLouisianaLeapTargets();
    console.log(`    LA: ${la.length} PDFs`);
    results.push(...la);
  } catch (e) {
    console.warn("    LA scrape failed:", (e as Error).message);
  }

  console.log("  Scanning all state portal pages for released PDFs...");
  try {
    const portal = await scrapeAllPortalStates(STATE_SOURCES);
    console.log(`    Portal scan total: ${portal.length} PDFs`);
    results.push(...portal);
  } catch (e) {
    console.warn("    Portal scan failed:", (e as Error).message);
  }

  console.log("  Deep crawl of state assessment subpages...");
  try {
    const deep = await scrapeAllStatesDeep(STATE_SOURCES);
    console.log(`    Deep crawl total: ${deep.length} PDFs`);
    results.push(...deep);
  } catch (e) {
    console.warn("    Deep crawl failed:", (e as Error).message);
  }

  return results;
}

/** Merge discovered targets over static catalog; prefer unique localPath. */
export function mergeTargets(
  staticTargets: ReleaseDownloadTarget[],
  discovered: ReleaseDownloadTarget[],
): ReleaseDownloadTarget[] {
  const byPath = new Map<string, ReleaseDownloadTarget>();

  for (const t of staticTargets) {
    byPath.set(t.localPath, t);
  }
  for (const t of discovered) {
    // Discovered URLs override static guesses for same slot
    const key = `${t.stateCode}/${t.year}/${t.subject}/g${t.grade}-${t.url.split("/").pop()}`;
    const existing = [...byPath.values()].find(
      (e) =>
        e.stateCode === t.stateCode &&
        e.year === t.year &&
        e.grade === t.grade &&
        e.subject === t.subject &&
        e.url.split("/").pop() === t.url.split("/").pop(),
    );
    if (!existing) {
      byPath.set(t.localPath, t);
    } else if (t.url !== existing.url) {
      // Add as alternate file
      byPath.set(t.localPath, t);
    }
  }

  return [...byPath.values()];
}
