import { prisma } from "../src/lib/db";

async function main() {
  const unverified = await prisma.user.findMany({
    where: { emailVerified: null },
    select: { email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const tokens = await prisma.authToken.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { email: true, type: true, token: true, expiresAt: true, usedAt: true },
  });

  console.log("Unverified users:", JSON.stringify(unverified, null, 2));
  console.log("Recent tokens:", JSON.stringify(tokens, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
