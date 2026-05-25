import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listFriendsData, orderedPair } from "@/lib/chat";

export async function GET() {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await listFriendsData(session.user.studentProfileId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const body = await request.json();
  const action = String(body.action ?? "");
  const targetStudentId = body.studentId ? String(body.studentId) : null;
  const requestId = body.requestId ? String(body.requestId) : null;

  if (action === "request") {
    if (!targetStudentId || targetStudentId === studentId) {
      return NextResponse.json({ error: "Invalid student" }, { status: 400 });
    }

    const target = await prisma.studentProfile.findFirst({
      where: { id: targetStudentId, activeStatus: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const [low, high] = orderedPair(studentId, targetStudentId);
    const existingFriendship = await prisma.studentFriendship.findUnique({
      where: {
        studentLowId_studentHighId: { studentLowId: low, studentHighId: high },
      },
    });
    if (existingFriendship) {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }

    const reversePending = await prisma.friendRequest.findUnique({
      where: {
        fromStudentId_toStudentId: {
          fromStudentId: targetStudentId,
          toStudentId: studentId,
        },
      },
    });
    if (reversePending?.status === "PENDING") {
      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: reversePending.id },
          data: { status: "ACCEPTED" },
        }),
        prisma.studentFriendship.create({
          data: { studentLowId: low, studentHighId: high },
        }),
      ]);
      return NextResponse.json({ ok: true, accepted: true });
    }

    await prisma.friendRequest.upsert({
      where: {
        fromStudentId_toStudentId: {
          fromStudentId: studentId,
          toStudentId: targetStudentId,
        },
      },
      create: {
        fromStudentId: studentId,
        toStudentId: targetStudentId,
        status: "PENDING",
      },
      update: { status: "PENDING", updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "accept") {
    const req = requestId
      ? await prisma.friendRequest.findFirst({
          where: { id: requestId, toStudentId: studentId, status: "PENDING" },
        })
      : targetStudentId
        ? await prisma.friendRequest.findFirst({
            where: {
              fromStudentId: targetStudentId,
              toStudentId: studentId,
              status: "PENDING",
            },
          })
        : null;

    if (!req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const [low, high] = orderedPair(req.fromStudentId, req.toStudentId);
    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: req.id },
        data: { status: "ACCEPTED" },
      }),
      prisma.studentFriendship.upsert({
        where: {
          studentLowId_studentHighId: { studentLowId: low, studentHighId: high },
        },
        create: { studentLowId: low, studentHighId: high },
        update: {},
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === "decline") {
    const req = requestId
      ? await prisma.friendRequest.findFirst({
          where: { id: requestId, toStudentId: studentId, status: "PENDING" },
        })
      : null;
    if (!req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    await prisma.friendRequest.update({
      where: { id: req.id },
      data: { status: "DECLINED" },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    if (!targetStudentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }
    const [low, high] = orderedPair(studentId, targetStudentId);
    await prisma.studentFriendship.deleteMany({
      where: { studentLowId: low, studentHighId: high },
    });
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { fromStudentId: studentId, toStudentId: targetStudentId },
          { fromStudentId: targetStudentId, toStudentId: studentId },
        ],
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
