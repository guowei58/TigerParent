/**
 * Download and import official/OER question banks into TigerParent.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/import-question-banks.ts
 *   npx tsx --env-file=.env scripts/import-question-banks.ts --gsm8k-only
 *   npx tsx --env-file=.env scripts/import-question-banks.ts --limit 500
 */
import { execSync } from "child_process";
import fs from "fs";
import { prisma } from "@/lib/db";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";
import { alignProblemsToSkillStandards } from "../prisma/standards-seed";
import { importGsm8k } from "./importers/gsm8k";
import { importNysedMath2024 } from "./importers/nysed-math";
import { importStaarG5Math2019 } from "./importers/staar-g5-math";
import { importSatPracticeTest10 } from "./importers/sat-practice";

async function seedSources() {
  for (const entry of SOURCE_REGISTRY) {
    await prisma.contentSource.upsert({
      where: { id: entry.id },
      update: {
        name: entry.name,
        shortName: entry.shortName,
        sourceType: entry.sourceType,
        importAllowed: entry.importStatus === "FULL_IMPORT_ALLOWED",
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
        importAllowed: entry.importStatus === "FULL_IMPORT_ALLOWED",
        attributionText: entry.attributionText,
        active: true,
      },
    });
  }
}

async function ensureDownloads() {
  if (!fs.existsSync("data/imports")) fs.mkdirSync("data/imports", { recursive: true });

  const downloads: Array<{ url: string; out: string }> = [
    {
      url: "https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/train.jsonl",
      out: "data/imports/gsm8k-train.jsonl",
    },
    {
      url: "https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/test.jsonl",
      out: "data/imports/gsm8k-test.jsonl",
    },
    {
      url: "https://satsuite.collegeboard.org/media/pdf/sat-practice-test-10-digital.pdf",
      out: "data/imports/sat-practice-test-10.pdf",
    },
    {
      url: "https://satsuite.collegeboard.org/media/pdf/sat-practice-test-10-answers-digital.pdf",
      out: "data/imports/sat-practice-test-10-answers.pdf",
    },
  ];

  for (const g of [3, 4, 5, 6, 7, 8]) {
    downloads.push({
      url: `https://www.nysedregents.org/ei/math/2024/2024-released-items-math-g${g}.pdf`,
      out: `data/imports/nysed-2024-math-g${g}.pdf`,
    });
  }

  for (const d of downloads) {
    if (fs.existsSync(d.out) && fs.statSync(d.out).size > 1000) continue;
    console.log(`Downloading ${d.out}...`);
    try {
      execSync(
        `powershell -Command "Invoke-WebRequest -Uri '${d.url}' -OutFile '${d.out}'"`,
        { stdio: "inherit" },
      );
    } catch {
      console.warn(`  failed: ${d.url}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const gsm8kOnly = args.includes("--gsm8k-only");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  console.log("=== TigerParent Question Bank Import ===\n");
  await seedSources();
  await ensureDownloads();

  const results: Record<string, { imported: number; skipped: number }> = {};

  if (!gsm8kOnly) {
    console.log("\n--- NYSED 2024 Math (Grades 3-8) ---");
    results.nysed = await importNysedMath2024({ autoApprove: true });

    console.log("\n--- TEA STAAR 2019 Grade 5 Math ---");
    results.staar = await importStaarG5Math2019({ autoApprove: true });

    console.log("\n--- College Board SAT Practice Test 10 ---");
    results.sat = await importSatPracticeTest10({ autoApprove: true });
  }

  console.log("\n--- GSM8K Word Problems ---");
  results.gsm8k = await importGsm8k({ limit, autoApprove: true });

  console.log("\n--- Aligning standards ---");
  const alignCount = await alignProblemsToSkillStandards();
  console.log(`  ${alignCount} problem-standard alignments`);

  console.log("\n=== Import Summary ===");
  for (const [name, r] of Object.entries(results)) {
    console.log(`  ${name}: ${r.imported} imported, ${r.skipped} skipped`);
  }

  console.log("\nRun: npx tsx --env-file=.env scripts/report-bank-composition.ts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
