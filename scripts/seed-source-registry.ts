import { prisma } from "@/lib/db";
import { SOURCE_REGISTRY } from "@/lib/content-provenance/source-registry";

async function main() {
  console.log("Seeding content source registry...");
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
        termsUrl: entry.termsUrl,
        licenseName: entry.licenseName,
        licenseType: entry.licenseType,
        importStatus: entry.importStatus,
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
        termsUrl: entry.termsUrl,
        licenseName: entry.licenseName,
        licenseType: entry.licenseType,
        importStatus: entry.importStatus,
        canStoreFullText: entry.canStoreFullText,
        canDisplayToStudents: entry.canDisplayToStudents,
        canModify: entry.canModify,
        canRedistribute: entry.canRedistribute,
        attributionRequired: entry.attributionRequired,
        attributionText: entry.attributionText,
        allowedUseNotes: entry.notes,
        active: true,
        importAllowed: entry.importStatus === "FULL_IMPORT_ALLOWED",
      },
    });
  }

  await prisma.problem.updateMany({
    where: {
      OR: [{ sourceType: "SYSTEM_GENERATED" }, { contentClass: "GENERATED" }],
    },
    data: {
      sourceId: "tigerparent-generated",
      sourceName: "TigerParent Generated Drills",
      usageType: "FLUENCY_DRILL",
      copyrightStatus: "GENERATED",
      contentClass: "GENERATED",
    },
  });

  console.log(`Registered ${SOURCE_REGISTRY.length} sources.`);
  console.log("Marked generated bank as FLUENCY_DRILL / tigerparent-generated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
