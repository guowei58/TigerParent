import { prisma } from "@/lib/db";
import { allConceptSeeds } from "./mathConceptTaxonomy";
import { ELA_READING_CONCEPTS } from "./elaConceptTaxonomy";

export async function seedPracticeConcepts() {
  const seeds = [...allConceptSeeds(), ...ELA_READING_CONCEPTS];
  let count = 0;
  for (const s of seeds) {
    await prisma.practiceConcept.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        domain: s.domain,
        gradeLevel: s.gradeLevel,
        subject: s.subject,
        description: s.description,
        sortOrder: s.sortOrder,
      },
      create: {
        subject: s.subject,
        gradeLevel: s.gradeLevel,
        domain: s.domain,
        name: s.name,
        slug: s.slug,
        description: s.description,
        sortOrder: s.sortOrder,
      },
    });
    count++;
  }
  return count;
}
