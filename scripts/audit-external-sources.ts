/**
 * Audit product-spec sources (A–E) vs registry and DB problem counts.
 * Usage: npm run db:audit-external-sources
 */
import { prisma } from "@/lib/db";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";

const SPEC_GROUPS: Record<string, string[]> = {
  "A. Official / benchmark": [
    "tea-staar",
    "nysed-released",
    "naep-released",
    "va-sol-released",
    "sbac-caaspp-practice",
    "college-board-sat-qbank",
    "college-board-educator-qbank",
    "college-board-sat-pdf",
    "khan-sat",
  ],
  "B. OER / curriculum": [
    "illustrative-math",
    "engageny",
    "core-knowledge",
    "el-education",
    "openstax",
    "ck12",
    "phet",
    "easypeasy",
    "ambleside",
  ],
  "C. Reading / ELA": ["readworks", "commonlit", "ckla", "el-education", "nysed-released"],
  "D. Math challenge": ["beast-aops", "gsm8k", "eedi-kaggle", "webwork-opl", "mathcounts-amc"],
  "E. Commercial / external": [
    "problem-attic",
    "ixl",
    "zearn",
    "teaching-textbooks",
    "math-mammoth",
    "saxon",
    "learnosity-mastery",
    "edcite",
  ],
};

async function main() {
  const counts = await prisma.problem.groupBy({
    by: ["sourceId"],
    _count: { id: true },
  });
  const countMap = new Map(counts.map((c) => [c.sourceId, c._count.id]));

  console.log("\n=== External Source Audit (spec A–E) ===\n");

  let missing = 0;
  let thin = 0;

  for (const [group, ids] of Object.entries(SPEC_GROUPS)) {
    console.log(`\n${group}`);
    for (const id of ids) {
      const entry = SOURCE_REGISTRY.find((s) => s.id === id);
      const n = countMap.get(id) ?? 0;
      if (!entry) {
        console.log(`  ?  ${id.padEnd(32)} NOT IN REGISTRY`);
        missing++;
        continue;
      }
      const status =
        n === 0
          ? "EMPTY"
          : n < 10 && entry.importStatus === "FULL_IMPORT_ALLOWED"
            ? "THIN"
            : "OK";
      if (status === "EMPTY") missing++;
      if (status === "THIN") thin++;
      const mode = entry.importStatus.padEnd(22);
      console.log(
        `  ${status.padEnd(5)} ${entry.shortName.padEnd(18)} ${String(n).padStart(6)}  ${mode}`,
      );
    }
  }

  const stateOfficial = await prisma.problem.count({
    where: { usageType: "OFFICIAL_RELEASED", sourceId: { not: "tigerparent-generated" } },
  });
  console.log(`\n--- State release sources (51 jurisdictions) ---`);
  console.log(`  Total OFFICIAL_RELEASED (non-generated): ${stateOfficial}`);

  console.log(`\nSummary: ${missing} empty registry targets, ${thin} thin FULL_IMPORT sources (<10 items)`);
  console.log("\nRun: npm run db:import-external-catalog");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
