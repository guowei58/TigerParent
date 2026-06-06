import "dotenv/config";
import { prisma } from "../src/lib/db";

const email = (process.argv[2] ?? "").toLowerCase().trim();
if (!email) {
  console.error("Usage: npx tsx scripts/delete-user.ts <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { studentProfile: { select: { id: true, displayName: true } } },
  });

  if (!user) {
    console.log("User not found:", email);
    return;
  }

  const sid = user.studentProfile?.id;
  const attempts = await prisma.pdfProblemAttempt.deleteMany({
    where: {
      OR: [{ userId: user.id }, ...(sid ? [{ studentProfileId: sid }] : [])],
    },
  });
  await prisma.authToken.deleteMany({ where: { email: user.email } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log(
    "Removed",
    user.email,
    user.studentProfile?.displayName ?? "",
    `(pdf attempts: ${attempts.count})`,
  );

  const remaining = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { email: "asc" },
  });
  console.log("\nRemaining users:");
  for (const u of remaining) console.log(`  ${u.email} (${u.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
