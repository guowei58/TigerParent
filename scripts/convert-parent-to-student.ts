import "dotenv/config";
import { prisma } from "../src/lib/db";

async function provisionStudentProfile(
  user: { id: string; name: string; familyId: string | null },
) {
  if (!user.familyId) {
    throw new Error(`User ${user.id} has no familyId`);
  }

  const profile = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      familyId: user.familyId,
      displayName: user.name.split(" ")[0] || user.name,
      schoolGrade: 4,
      dailyGoalMinutes: 30,
      targetAheadMonths: 6,
    },
  });

  await prisma.studentSettings.create({
    data: { studentId: profile.id, onboardingCompleted: false },
  });

  const subjects = await prisma.subject.findMany();
  for (const subject of subjects) {
    await prisma.studentSubject.create({
      data: { studentId: profile.id, subjectId: subject.id, enabled: true },
    });
  }

  return profile;
}

async function convertUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { studentProfile: true },
  });

  if (!user) {
    console.log("Not found:", email);
    return;
  }

  if (user.role === "STUDENT" && user.studentProfile) {
    console.log("Already student:", email);
    return;
  }

  if (!user.familyId) {
    const family = await prisma.organization.create({
      data: { name: `${user.name.split(" ")[0] || user.name} Family`, type: "FAMILY" },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { familyId: family.id },
    });
    user.familyId = family.id;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "STUDENT" },
  });

  if (!user.studentProfile) {
    const profile = await provisionStudentProfile(user);
    console.log("Converted", email, "→ student", profile.id);
  } else {
    console.log("Updated role to STUDENT for", email);
  }
}

async function main() {
  const arg = process.argv[2];

  if (arg === "--all") {
    const parents = await prisma.user.findMany({
      where: { role: "PARENT" },
      select: { email: true },
      orderBy: { email: "asc" },
    });

    if (parents.length === 0) {
      console.log("No PARENT accounts to convert.");
      return;
    }

    for (const { email } of parents) {
      await convertUser(email);
    }
    return;
  }

  const email = arg ?? "";
  if (!email) {
    console.error("Usage: npx tsx scripts/convert-parent-to-student.ts <email>");
    console.error("       npx tsx scripts/convert-parent-to-student.ts --all");
    process.exit(1);
  }

  await convertUser(email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
