import { prisma } from "../src/lib/db";

async function main() {
  const result = await prisma.user.updateMany({
    where: { emailVerified: null },
    data: { emailVerified: new Date() },
  });

  console.log(`Marked ${result.count} existing user(s) as email-verified.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
