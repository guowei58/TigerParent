import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && session?.user.role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { videoId } = await params;
  const { approvedByParent } = await request.json();

  const video = await prisma.videoResource.update({
    where: { id: videoId },
    data: { approvedByParent },
  });

  return NextResponse.json(video);
}
