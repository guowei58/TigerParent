import { seedPracticeConcepts } from "../src/lib/concepts/seedConcepts";

async function main() {
  const n = await seedPracticeConcepts();
  console.log(`Seeded ${n} practice concepts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
