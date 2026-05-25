/**
 * Backfill provenance, default content sources, and confidence scores.
 * Run: npm run db:backfill-provenance
 */
import { prisma } from "../src/lib/db";

async function ensureDefaultSources() {
  await prisma.contentSource.upsert({
    where: { id: "source-generated-practice" },
    create: {
      id: "source-generated-practice",
      name: "TigerParent Generated Practice",
      sourceType: "GENERATED",
      publisher: "TigerParent",
      licenseType: "Internal generated content",
      allowedUseNotes:
        "Deterministic/ template-generated practice items. Not official STAAR, TEKS exam items, or College Board SAT questions.",
      attributionRequired: false,
      commercialUseAllowed: true,
      redistributionAllowed: false,
      importAllowed: false,
    },
    update: {},
  });

  await prisma.contentSource.upsert({
    where: { id: "source-staar-released" },
    create: {
      id: "source-staar-released",
      name: "TEA STAAR Released Items",
      sourceType: "OFFICIAL_RELEASED",
      publisher: "Texas Education Agency",
      url: "https://tea.texas.gov/student-assessment/staar/released-test-questions",
      licenseType: "Public released test questions",
      termsUrl: "https://tea.texas.gov/",
      allowedUseNotes:
        "Import only manually from official TEA released materials where storage/display is permitted. No scraping.",
      attributionRequired: true,
      commercialUseAllowed: false,
      redistributionAllowed: false,
      importAllowed: true,
    },
    update: {},
  });

  await prisma.contentSource.upsert({
    where: { id: "source-sat-official" },
    create: {
      id: "source-sat-official",
      name: "College Board / Khan Academy SAT Practice",
      sourceType: "OFFICIAL_RELEASED",
      publisher: "College Board",
      url: "https://satsuite.collegeboard.org/practice",
      licenseType: "Official practice — verify terms before import",
      allowedUseNotes:
        "Manual import only with permitted license terms. Do not scrape. Label generated SAT-style items as OFFICIAL_STYLE, not official.",
      attributionRequired: true,
      commercialUseAllowed: false,
      redistributionAllowed: false,
      importAllowed: true,
    },
    update: {},
  });
}

async function bulkBackfillProvenance() {
  console.log("Bulk updating provenance fields...");
  const updated = await prisma.$executeRaw`
    UPDATE "Problem" p
    SET
      "sourceId" = COALESCE(p."sourceId", 'source-generated-practice'),
      "sourceName" = COALESCE(NULLIF(p."sourceName", ''), 'TigerParent Generated Practice'),
      "contentClass" = COALESCE(p."contentClass", 'GENERATED'::"ProblemContentClass"),
      "copyrightStatus" = CASE
        WHEN p."copyrightStatus" = 'UNKNOWN'::"CopyrightStatus" THEN 'GENERATED'::"CopyrightStatus"
        ELSE p."copyrightStatus"
      END,
      "provenanceStatus" = CASE
        WHEN p."reviewStatus" = 'APPROVED'::"ProblemReviewStatus"
          AND p."approved" = true
          AND p."studentReady" = true
          THEN 'VERIFIED'::"ProvenanceStatus"
        WHEN p."provenanceStatus" = 'UNKNOWN'::"ProvenanceStatus"
          THEN 'NEEDS_REVIEW'::"ProvenanceStatus"
        ELSE p."provenanceStatus"
      END,
      "usageType" = COALESCE(
        p."usageType",
        CASE
          WHEN p."contentClass" = 'OFFICIAL_RELEASED'::"ProblemContentClass"
            THEN 'OFFICIAL_RELEASED'::"ProblemUsageType"
          ELSE 'CONCEPT_PRACTICE'::"ProblemUsageType"
        END
      ),
      "attributionText" = COALESCE(
        p."attributionText",
        'Generated practice — not official STAAR/SAT exam content'
      ),
      "confidenceScore" = CASE
        WHEN p."contentClass" = 'OFFICIAL_RELEASED'::"ProblemContentClass" THEN 80
        WHEN p."contentClass" = 'LICENSED_OR_OER'::"ProblemContentClass" THEN 72
        WHEN p."reviewStatus" = 'APPROVED'::"ProblemReviewStatus"
          AND p."approved" = true
          AND p."studentReady" = true
          THEN 68
        ELSE 35
      END,
      "confidenceLevel" = CASE
        WHEN p."contentClass" = 'OFFICIAL_RELEASED'::"ProblemContentClass" THEN 'HIGH'::"ConfidenceLevel"
        WHEN p."contentClass" = 'LICENSED_OR_OER'::"ProblemContentClass" THEN 'HIGH'::"ConfidenceLevel"
        WHEN p."reviewStatus" = 'APPROVED'::"ProblemReviewStatus"
          AND p."approved" = true
          AND p."studentReady" = true
          THEN 'MEDIUM'::"ConfidenceLevel"
        ELSE 'NEEDS_REVIEW'::"ConfidenceLevel"
      END,
      "canShowToStudent" = (
        p."reviewStatus" = 'APPROVED'::"ProblemReviewStatus"
        AND p."approved" = true
        AND p."studentReady" = true
        AND COALESCE(p."contentClass", 'GENERATED'::"ProblemContentClass") <> 'GENERATED'::"ProblemContentClass"
          OR (
            p."reviewStatus" = 'APPROVED'::"ProblemReviewStatus"
            AND p."approved" = true
            AND p."studentReady" = true
            AND p."explanation" IS NOT NULL
            AND p."explanation" <> ''
          )
      ),
      "updatedAt" = NOW()
  `;
  return Number(updated);
}

async function main() {
  await ensureDefaultSources();
  console.log("Default content sources ready.");

  const count = await bulkBackfillProvenance();
  console.log(`Done. Backfilled ${count} problems.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
