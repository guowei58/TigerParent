import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertConversationMember,
  conversationTitle,
  sanitizeMessage,
} from "@/lib/chat";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const studentId = session.user.studentProfileId;

  try {
    await assertConversationMember(conversationId, studentId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  if (since) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        createdAt: { gt: new Date(since) },
      },
      include: {
        sender: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    if (messages.length > 0) {
      await prisma.conversationMember.update({
        where: {
          conversationId_studentId: { conversationId, studentId },
        },
        data: { lastReadAt: new Date() },
      });
    }

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { members: { include: { student: true } } },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        title: conversationTitle(conversation, studentId),
        members: conversation.members.map((m) => ({
          id: m.student.id,
          displayName: m.student.displayName,
        })),
      },
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: m.sender.displayName,
        createdAt: m.createdAt.toISOString(),
        isMine: m.senderId === studentId,
      })),
    });
  }

  const messages = (
        await prisma.chatMessage.findMany({
          where: { conversationId },
          include: {
            sender: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      ).reverse();

  await prisma.conversationMember.update({
    where: {
      conversationId_studentId: { conversationId, studentId },
    },
    data: { lastReadAt: new Date() },
  });

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { members: { include: { student: true } } },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      type: conversation.type,
      title: conversationTitle(conversation, studentId),
      members: conversation.members.map((m) => ({
        id: m.student.id,
        displayName: m.student.displayName,
      })),
    },
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: m.sender.displayName,
      createdAt: m.createdAt.toISOString(),
      isMine: m.senderId === studentId,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const studentId = session.user.studentProfileId;
  const body = await request.json();
  const content = sanitizeMessage(String(body.content ?? ""));

  if (!content) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  try {
    await assertConversationMember(conversationId, studentId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: studentId,
      content,
    },
    include: {
      sender: { select: { id: true, displayName: true } },
    },
  });

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
    prisma.conversationMember.update({
      where: {
        conversationId_studentId: { conversationId, studentId },
      },
      data: { lastReadAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    message: {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender.displayName,
      createdAt: message.createdAt.toISOString(),
      isMine: true,
    },
  });
}
