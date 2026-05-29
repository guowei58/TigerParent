/**
 * Report official practice problems by state/jurisdiction.
 */
import { prisma } from "@/lib/db";
import { STATE_SOURCES } from "./state-releases/catalog";

async function main() {
  const official = await prisma.problem.groupBy({
    by: ["sourceId"],
    where: { usageType: "OFFICIAL_RELEASED" },
    _count: { id: true },
  });

  const sources = await prisma.contentSource.findMany({
    select: { id: true, shortName: true, name: true, jurisdiction: true, importStatus: true, url: true },
  });
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const byState = new Map<string, number>();
  for (const row of official) {
    const src = sourceById.get(row.sourceId ?? "");
    const state = src?.jurisdiction ?? "??";
    byState.set(state, (byState.get(state) ?? 0) + row._count.id);
  }

  console.log("\n=== Official Released Problems by State ===\n");
  const sorted = [...byState.entries()].sort((a, b) => b[1] - a[1]);
  for (const [state, count] of sorted) {
    const src = sources.find((s) => s.jurisdiction === state);
    console.log(`  ${state.padEnd(4)} ${String(count).padStart(6)}  ${src?.shortName ?? ""}`);
  }
  console.log(`\n  TOTAL ${sorted.reduce((a, [, c]) => a + c, 0)} official items in ${sorted.length} states\n`);

  console.log("=== All 51 State Sources (registry) ===\n");
  const registered = new Set(STATE_SOURCES.map((s) => s.stateCode));
  const withItems = new Set(sorted.map(([s]) => s));

  for (const s of STATE_SOURCES.sort((a, b) => a.stateCode.localeCompare(b.stateCode))) {
    const count = byState.get(s.stateCode) ?? 0;
    const status =
      count > 0 ? "HAS_ITEMS" : s.importMode === "FULL" ? "READY_NO_ITEMS" : "LINK_ONLY";
    console.log(
      `  ${s.stateCode}  ${s.shortName.padEnd(12)}  ${s.importMode.padEnd(10)}  ${String(count).padStart(5)}  ${status}`,
    );
  }

  const missing = [...registered].filter((s) => !withItems.has(s));
  console.log(`\n  States with zero imported items: ${missing.length}/51`);
  console.log(`  ${missing.join(", ")}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
