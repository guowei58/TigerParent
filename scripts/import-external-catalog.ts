/**
 * Import all external catalog sources: registry seed, link catalog, OpenStax, NAEP,
 * question banks (NYSED/STAAR/GSM8K), and state PDF releases.
 *
 * Usage:
 *   npm run db:import-external-catalog
 *   npm run db:import-external-catalog -- --skip-state-pdfs
 *   npm run db:import-external-catalog -- --links-only
 */
import { prisma } from "@/lib/db";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";
import { alignProblemsToSkillStandards } from "../prisma/standards-seed";
import { importLinkCatalog } from "./importers/link-catalog";
import { importNaepSamples } from "./importers/naep";
import { importOpenStaxExercises } from "./importers/openstax";
import { importGsm8k } from "./importers/gsm8k";
import { importNysedMath2024 } from "./importers/nysed-math";
import { importStaarG5Math2019 } from "./importers/staar-g5-math";
import { importSatPracticeTest10 } from "./importers/sat-practice";
import { importOerCurriculumSamples } from "./importers/oer-curriculum-samples";
import { seedStateSources, importFromManifest } from "./state-releases/import-all-helpers";

async function seedRegistry() {
  for (const entry of SOURCE_REGISTRY) {
    await prisma.contentSource.upsert({
      where: { id: entry.id },
      update: {
        name: entry.name,
        shortName: entry.shortName,
        sourceType: entry.sourceType,
        publisher: entry.publisher,
        jurisdiction: entry.jurisdiction,
        url: entry.url,
        licenseName: entry.licenseName,
        licenseType: entry.licenseType,
        importStatus: entry.importStatus,
        importAllowed: entry.importStatus !== "NEEDS_REVIEW",
        canStoreFullText: entry.canStoreFullText,
        canDisplayToStudents: entry.canDisplayToStudents,
        canModify: entry.canModify,
        canRedistribute: entry.canRedistribute,
        attributionRequired: entry.attributionRequired,
        attributionText: entry.attributionText,
        allowedUseNotes: entry.notes,
        active: true,
      },
      create: {
        id: entry.id,
        name: entry.name,
        shortName: entry.shortName,
        sourceType: entry.sourceType,
        publisher: entry.publisher,
        jurisdiction: entry.jurisdiction,
        url: entry.url,
        licenseName: entry.licenseName,
        licenseType: entry.licenseType,
        importStatus: entry.importStatus,
        importAllowed: entry.importStatus !== "NEEDS_REVIEW",
        canStoreFullText: entry.canStoreFullText,
        canDisplayToStudents: entry.canDisplayToStudents,
        canModify: entry.canModify,
        canRedistribute: entry.canRedistribute,
        attributionRequired: entry.attributionRequired,
        attributionText: entry.attributionText,
        allowedUseNotes: entry.notes,
        active: true,
      },
    });
  }
  console.log(`Registered ${SOURCE_REGISTRY.length} sources in registry`);
}

async function main() {
  const args = process.argv.slice(2);
  const linksOnly = args.includes("--links-only");
  const skipState = args.includes("--skip-state-pdfs");
  const skipBanks = args.includes("--skip-banks");

  console.log("=== Import External Content Catalog ===\n");
  await seedRegistry();

  console.log("\n--- Link / manual-tracking catalog (LINK_ONLY sources) ---");
  await importLinkCatalog({ autoApprove: true });

  if (!linksOnly) {
    console.log("\n--- NAEP released samples ---");
    await importNaepSamples({ autoApprove: true });

    console.log("\n--- OpenStax exercises (K–12 math books) ---");
    await importOpenStaxExercises({ pagesPerBook: 2, autoApprove: true });

    console.log("\n--- Illustrative Math / EngageNY samples ---");
    await importOerCurriculumSamples({ autoApprove: true });

    if (!skipBanks) {
      console.log("\n--- Core question banks ---");
      await importNysedMath2024({ autoApprove: true });
      await importStaarG5Math2019({ autoApprove: true });
      await importSatPracticeTest10({ autoApprove: true });
      await importGsm8k({ autoApprove: true });
    }

    if (!skipState) {
      console.log("\n--- State released PDFs (on-disk manifest) ---");
      await seedStateSources();
      await importFromManifest();
    }

    console.log("\n--- Align standards ---");
    const n = await alignProblemsToSkillStandards();
    console.log(`  ${n} alignments`);
  }

  console.log("\nDone. Run: npm run db:audit-external-sources");
  console.log("      npm run db:report-bank-composition");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
