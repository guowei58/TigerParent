import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const PASSWORD = "mathisfun";

const STUDENTS = [
  {
    email: "audreybeezhang@gmail.com",
    name: "Audrey",
    displayName: "Audrey",
    schoolGrade: 6,
  },
  {
    email: "oliviabeezhang@gmail.com",
    name: "Olivia",
    displayName: "Olivia",
    schoolGrade: 4,
  },
] as const;

async function createStudent(
  familyId: string,
  student: (typeof STUDENTS)[number],
) {
  const email = student.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Already exists:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const verifiedAt = new Date();

  const user = await prisma.user.create({
    data: {
      email,
      name: student.name,
      password: passwordHash,
      role: "STUDENT",
      familyId,
      emailVerified: verifiedAt,
    },
  });

  const profile = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      familyId,
      displayName: student.displayName,
      schoolGrade: student.schoolGrade,
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

  console.log("Created", email, `grade ${student.schoolGrade}`, profile.id);
}

async function main() {
  const family = await prisma.organization.create({
    data: { name: "Zhang Family", type: "FAMILY" },
  });

  for (const student of STUDENTS) {
    await createStudent(family.id, student);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
