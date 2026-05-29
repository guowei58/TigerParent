import "dotenv/config";
import { prisma } from "../src/lib/db";

const KEEP_EMAILS = new Set([
  "admin@tigerparent.local",
  "studenta@tigerparent.local",
  "studentb@tigerparent.local",
]);

const DEMO_FAMILY_ID = "demo-family";

async function main() {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      studentProfile: { select: { id: true, displayName: true } },
    },
    orderBy: { email: "asc" },
  });

  const keepUsers = allUsers.filter((u) => KEEP_EMAILS.has(u.email));
  const removeUsers = allUsers.filter((u) => !KEEP_EMAILS.has(u.email));

  console.log(`Users in DB: ${allUsers.length}`);
  console.log(`Keeping (${keepUsers.length}):`);
  for (const u of keepUsers) {
    console.log(`  - ${u.email} (${u.role})`);
  }
  console.log(`Removing (${removeUsers.length}):`);
  for (const u of removeUsers) {
    console.log(`  - ${u.email} (${u.role})`);
  }

  if (removeUsers.length === 0) {
    console.log("\nNothing to remove.");
    return;
  }

  const keepUserIds = new Set(keepUsers.map((u) => u.id));
  const keepStudentIds = new Set(
    keepUsers.map((u) => u.studentProfile?.id).filter(Boolean) as string[],
  );

  const pdfAttempts = await prisma.pdfProblemAttempt.deleteMany({
    where: {
      OR: [
        {
          studentProfileId: { not: null, notIn: [...keepStudentIds] },
        },
        {
          userId: { not: null, notIn: [...keepUserIds] },
        },
      ],
    },
  });
  console.log(`\nDeleted ${pdfAttempts.count} PDF practice attempts for removed users.`);

  const authTokens = await prisma.authToken.deleteMany({
    where: { email: { notIn: [...KEEP_EMAILS] } },
  });
  console.log(`Deleted ${authTokens.count} auth tokens for removed emails.`);

  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { notIn: [...KEEP_EMAILS] } },
  });
  console.log(`Deleted ${deletedUsers.count} users.`);

  const deletedOrgs = await prisma.organization.deleteMany({
    where: { id: { not: DEMO_FAMILY_ID } },
  });
  console.log(`Deleted ${deletedOrgs.count} non-demo organizations.`);

  const remaining = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { email: "asc" },
  });
  console.log("\nRemaining accounts:");
  for (const u of remaining) {
    console.log(`  - ${u.email} (${u.role})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
