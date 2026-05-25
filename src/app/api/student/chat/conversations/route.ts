import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createGroupConversation,
  getOrCreateDirectConversation,
  listConversationsForStudent,
} from "@/lib/chat";

export async function GET() {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await listConversationsForStudent(
    session.user.studentProfileId,
  );
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const body = await request.json();
  const type = String(body.type ?? "direct");

  try {
    if (type === "direct") {
      const friendId = String(body.friendId ?? "");
      if (!friendId) {
        return NextResponse.json({ error: "friendId required" }, { status: 400 });
      }
      const conversation = await getOrCreateDirectConversation(studentId, friendId);
      return NextResponse.json({
        conversation: {
          id: conversation.id,
          type: conversation.type,
        },
      });
    }

    if (type === "group") {
      const name = String(body.name ?? "").trim();
      const memberIds = Array.isArray(body.memberIds)
        ? body.memberIds.map(String)
        : [];
      if (!name) {
        return NextResponse.json({ error: "Group name required" }, { status: 400 });
      }
      const conversation = await createGroupConversation(
        studentId,
        name,
        memberIds,
      );
      return NextResponse.json({
        conversation: {
          id: conversation.id,
          type: conversation.type,
          name: conversation.name,
        },
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    if (message === "NOT_FRIENDS") {
      return NextResponse.json(
        { error: "You can only message friends" },
        { status: 403 },
      );
    }
    if (message === "NEED_FRIENDS") {
      return NextResponse.json(
        { error: "Add at least one friend to the group" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
