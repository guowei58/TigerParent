import { prisma } from "../src/lib/db";

async function main() {
  await prisma.user.update({
    where: { email: "guowei58@gmail.com" },
    data: { emailVerified: new Date() },
  });
  console.log("Verified guowei58@gmail.com");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
