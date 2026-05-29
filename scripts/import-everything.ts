/**
 * Pull maximum practice content: purge bad PDFs, download, import all sources.
 * Usage: npm run db:import-everything
 */
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { purgeInvalidPdfFiles } from "./lib/pdf-valid";
import { downloadStateReleases } from "./state-releases/download";
import { importFromManifest, seedStateSources } from "./state-releases/import-all-helpers";
import { mergeTargets, discoverAllTargets } from "./state-releases/scrapers/index";
import { generateDownloadTargets, type ReleaseDownloadTarget } from "./state-releases/catalog";
import { alignProblemsToSkillStandards } from "../prisma/standards-seed";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";
import { importLinkCatalog } from "./importers/link-catalog";
import { importNaepSamples } from "./importers/naep";
import { importOpenStaxExercises } from "./importers/openstax";
import { importOerCurriculumSamples } from "./importers/oer-curriculum-samples";
import { importGsm8k } from "./importers/gsm8k";
import { importNysedMath2024 } from "./importers/nysed-math";
import { importStaarG5Math2019 } from "./importers/staar-g5-math";
import { importSatPracticeTest10 } from "./importers/sat-practice";
import { execSync } from "child_process";

async function seedRegistry() {
  for (const entry of SOURCE_REGISTRY) {
    await prisma.contentSource.upsert({
      where: { id: entry.id },
      update: {
        name: entry.name,
        shortName: entry.shortName,
        sourceType: entry.sourceType,
        importStatus: entry.importStatus,
        importAllowed: entry.importStatus !== "NEEDS_REVIEW",
        active: true,
      },
      create: {
        id: entry.id,
        name: entry.name,
        shortName: entry.shortName,
        sourceType: entry.sourceType,
        publisher: entry.publisher,
        importStatus: entry.importStatus,
        importAllowed: entry.importStatus !== "NEEDS_REVIEW",
        active: true,
      },
    });
  }
}

function ensureGsm8kDownloads() {
  if (!fs.existsSync("data/imports")) fs.mkdirSync("data/imports", { recursive: true });
  const train = "data/imports/gsm8k-train.jsonl";
  if (fs.existsSync(train) && fs.statSync(train).size > 1000) return;
  console.log("Downloading GSM8K...");
  execSync(
    'powershell -Command "Invoke-WebRequest -Uri \'https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/train.jsonl\' -OutFile \'data/imports/gsm8k-train.jsonl\'"',
    { stdio: "inherit" },
  );
  execSync(
    'powershell -Command "Invoke-WebRequest -Uri \'https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/test.jsonl\' -OutFile \'data/imports/gsm8k-test.jsonl\'"',
    { stdio: "inherit" },
  );
}

function writeManifestFromDiscovered() {
  const discPath = path.join("data", "state-releases", "discovered-targets.json");
  if (!fs.existsSync(discPath)) return;
  const discovered = JSON.parse(fs.readFileSync(discPath, "utf8")) as ReleaseDownloadTarget[];
  const staticT = generateDownloadTargets();
  const merged = mergeTargets(staticT, discovered);
  const manifest = merged.filter(
    (t) => fs.existsSync(t.localPath) && fs.statSync(t.localPath).size > 5000,
  );
  const out = path.join("data", "state-releases", "manifest.json");
  fs.writeFileSync(`${out}.tmp`, JSON.stringify(manifest, null, 2));
  fs.renameSync(`${out}.tmp`, out);
  console.log(`  manifest from discovered: ${manifest.length} on-disk entries`);
}

async function main() {
  const args = process.argv.slice(2);
  const resume = args.includes("--resume");
  const skipOpenStax = args.includes("--skip-openstax");
  const skipLinks = args.includes("--skip-links");

  console.log("=== IMPORT EVERYTHING ===\n");

  if (!resume) {
    console.log("--- Purge fake PDFs (HTML saved as .pdf) ---");
    const removed = purgeInvalidPdfFiles(path.join("data", "state-releases"));
    console.log(`  removed ${removed} invalid files`);

    console.log("\n--- Download state release PDFs (validated) ---");
    try {
      await downloadStateReleases();
    } catch (e) {
      console.warn("  download partial:", (e as Error).message);
    }
    writeManifestFromDiscovered();
  } else {
    console.log("--- Resume mode: skipping purge/download ---");
    writeManifestFromDiscovered();
  }

  await seedRegistry();

  if (!skipOpenStax) {
    console.log("\n--- OpenStax (max pages) ---");
    await importOpenStaxExercises({ pagesPerBook: 10, autoApprove: true });
  } else {
    console.log("\n--- OpenStax skipped ---");
  }

  if (!skipLinks) {
    console.log("\n--- Link catalog ---");
    await importLinkCatalog({ autoApprove: true });
  }

  console.log("\n--- NAEP + OER samples ---");
  await importNaepSamples({ autoApprove: true });
  await importOerCurriculumSamples({ autoApprove: true });

  console.log("\n--- Question banks ---");
  ensureGsm8kDownloads();
  await importNysedMath2024({ autoApprove: true });
  await importStaarG5Math2019({ autoApprove: true });
  await importSatPracticeTest10({ autoApprove: true });
  await importGsm8k({ autoApprove: true });

  console.log("\n--- State PDF import ---");
  await seedStateSources();
  await importFromManifest();

  console.log("\n--- Align standards ---");
  const n = await alignProblemsToSkillStandards();
  console.log(`  ${n} alignments`);

  console.log("\n=== DONE ===");
  console.log("Run: npm run db:report-bank-composition");
  console.log("     npm run db:report-state-coverage");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
