import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const skill = await prisma.skill.create({
    data: {
      ...body,
      prerequisiteSkillIdsJson: [],
      targetAccuracy: 0.9,
      targetMedianSeconds: 30,
      minProblemsForMastery: 20,
    },
  });

  await prisma.lesson.create({
    data: {
      skillId: skill.id,
      title: `${skill.title} Lesson`,
      content: skill.description ?? "Lesson content to be added.",
      workedExamplesJson: [],
      commonMistakesJson: [],
    },
  });

  return NextResponse.json(skill);
}
