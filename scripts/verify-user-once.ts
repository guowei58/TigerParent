import { prisma } from "../src/lib/db";

async function main() {
  await prisma.user.update({
    where: { email: "guowei58@hotmail.com" },
    data: { emailVerified: new Date() },
  });
  console.log("Verified guowei58@hotmail.com — you can sign in now.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
