import "dotenv/config";
import { prisma } from "../src/lib/db";

const DEMO_STUDENTS = ["studenta@tigerparent.local", "studentb@tigerparent.local"];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_STUDENTS } },
    include: { studentProfile: { select: { id: true, displayName: true } } },
  });

  if (users.length === 0) {
    console.log("No demo student accounts found.");
    return;
  }

  for (const user of users) {
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
  }

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
