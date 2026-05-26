/**
 * Download + import state released assessment items (all configured states/years).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/state-releases/import-all.ts
 *   npx tsx --env-file=.env scripts/state-releases/import-all.ts --download-only
 *   npx tsx --env-file=.env scripts/state-releases/import-all.ts --state NY
 */
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { alignProblemsToSkillStandards } from "../../prisma/standards-seed";
import { bulkImportProblems, loadSkillContext } from "../lib/import-helpers";
import { STATE_SOURCES, type ReleaseDownloadTarget } from "./catalog";
import { downloadStateReleases } from "./download";
import { parseReleasePdf } from "./parsers/index";
import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";

function dedupeBySourceId(items: ImportItemInput[]): ImportItemInput[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.sourceQuestionId) return true;
    if (seen.has(item.sourceQuestionId)) return false;
    seen.add(item.sourceQuestionId);
    return true;
  });
}

async function seedStateSources() {
  for (const s of STATE_SOURCES) {
    await prisma.contentSource.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        shortName: s.shortName,
        sourceType: "OFFICIAL_RELEASED",
        publisher: s.publisher,
        jurisdiction: s.stateCode,
        url: s.portalUrl,
        importAllowed: s.importMode === "FULL",
        importStatus: s.importMode === "FULL" ? "FULL_IMPORT_ALLOWED" : "LINK_ONLY",
        active: true,
      },
      create: {
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        sourceType: "OFFICIAL_RELEASED",
        publisher: s.publisher,
        jurisdiction: s.stateCode,
        url: s.portalUrl,
        importAllowed: s.importMode === "FULL",
        importStatus: s.importMode === "FULL" ? "FULL_IMPORT_ALLOWED" : "LINK_ONLY",
        attributionText: `© ${s.publisher} — released assessment item`,
        active: true,
      },
    });
  }
  console.log(`Registered ${STATE_SOURCES.length} state sources`);
}

function loadManifest(): ReleaseDownloadTarget[] {
  const p = path.join("data", "state-releases", "manifest.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")) as ReleaseDownloadTarget[];
}

async function importFromManifest(stateFilter?: string) {
  const ctx = await loadSkillContext();
  let manifest = loadManifest();
  if (stateFilter) manifest = manifest.filter((m) => m.stateCode === stateFilter);

  const bySource = new Map<string, ReleaseDownloadTarget[]>();
  for (const m of manifest) {
    const list = bySource.get(m.sourceId) ?? [];
    list.push(m);
    bySource.set(m.sourceId, list);
  }

  const totals: Record<string, { parsed: number; imported: number; skipped: number }> = {};

  for (const [sourceId, files] of bySource) {
    console.log(`\n--- Parsing ${sourceId} (${files.length} PDFs) ---`);
    const allItems = [];
    let parsedCount = 0;

    for (const file of files) {
      try {
        const items = await parseReleasePdf(file, ctx);
        if (items.length) {
          parsedCount += items.length;
          allItems.push(...items);
          process.stdout.write(
            `\r  ${file.stateCode} ${file.year} g${file.grade} ${file.subject}: +${items.length} items (total ${parsedCount})`,
          );
        }
      } catch (e) {
        console.warn(`\n  skip ${file.localPath}:`, (e as Error).message);
      }
    }
    console.log("");

    if (allItems.length === 0) {
      totals[sourceId] = { parsed: 0, imported: 0, skipped: 0 };
      continue;
    }

    const deduped = dedupeBySourceId(allItems);
    console.log(`  Importing ${deduped.length} items (${allItems.length - deduped.length} dupes removed)...`);
    const result = await bulkImportProblems(sourceId, deduped, {
      autoApprove: true,
      usageType: "OFFICIAL_RELEASED",
      batchNotes: `State release bulk import ${sourceId}`,
    });
    totals[sourceId] = {
      parsed: allItems.length,
      imported: result.imported,
      skipped: result.skipped,
    };
  }

  return totals;
}

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
    const alignCount = await alignProblemsToSkillStandards();
    console.log(`  ${alignCount} alignments`);

    console.log("\n=== Import Totals ===");
    let grandParsed = 0;
    let grandImported = 0;
    for (const [source, t] of Object.entries(totals)) {
      console.log(`  ${source}: ${t.imported} imported (${t.parsed} parsed, ${t.skipped} skipped)`);
      grandParsed += t.parsed;
      grandImported += t.imported;
    }
    console.log(`\n  TOTAL: ${grandImported} new official items (${grandParsed} parsed)`);
    console.log("\nRun: npm run db:report-banks");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
