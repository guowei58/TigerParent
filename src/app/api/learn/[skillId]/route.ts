import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLearningResourcesForSkill } from "@/lib/learning-library";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId } = await params;
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    include: {
      videos: { orderBy: { id: "asc" } },
      lessons: { take: 1 },
    },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const dbVideos = skill.videos
    .filter((v) => v.url && !v.url.endsWith("khanacademy.org/"))
    .map((v) => ({
      title: v.title,
      provider: v.provider as "Khan Academy" | "YouTube" | "ReadWorks" | "Other",
      url: v.url,
      durationSeconds: v.durationSeconds ?? undefined,
    }));

  const libraryVideos = getLearningResourcesForSkill(skill.title);

  const seen = new Set<string>();
  const resources = [...dbVideos, ...libraryVideos].filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return NextResponse.json({
    skillId: skill.id,
    skillTitle: skill.title,
    lessonUrl: `/student/lesson/${skill.id}`,
    resources: resources.slice(0, 4),
  });
}
