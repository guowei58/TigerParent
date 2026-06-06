import { prisma } from "./db";

export const MAX_MESSAGE_LENGTH = 2000;

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function sanitizeMessage(content: string) {
  return content.trim().slice(0, MAX_MESSAGE_LENGTH);
}

export async function areFriends(studentId: string, otherStudentId: string) {
  if (studentId === otherStudentId) return false;
  const [low, high] = orderedPair(studentId, otherStudentId);
  const friendship = await prisma.studentFriendship.findUnique({
    where: { studentLowId_studentHighId: { studentLowId: low, studentHighId: high } },
  });
  return Boolean(friendship);
}

export async function getFriendIds(studentId: string) {
  const rows = await prisma.studentFriendship.findMany({
    where: {
      OR: [{ studentLowId: studentId }, { studentHighId: studentId }],
    },
  });
  return rows.map((r) =>
    r.studentLowId === studentId ? r.studentHighId : r.studentLowId,
  );
}

export async function assertConversationMember(
  conversationId: string,
  studentId: string,
) {
  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_studentId: { conversationId, studentId },
    },
    include: {
      conversation: {
        include: {
          members: { include: { student: true } },
        },
      },
    },
  });
  if (!member) throw new Error("NOT_MEMBER");
  return member;
}

export async function findDirectConversation(
  studentId: string,
  friendId: string,
) {
  const candidateConversations = await prisma.conversation.findMany({
    where: {
      type: "DIRECT",
      members: { some: { studentId } },
    },
    include: {
      members: { include: { student: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    candidateConversations.find(
      (c) =>
        c.members.length === 2 &&
        c.members.some((m) => m.studentId === friendId),
    ) ?? null
  );
}

export async function getOrCreateDirectConversation(
  studentId: string,
  friendId: string,
) {
  if (!(await areFriends(studentId, friendId))) {
    throw new Error("NOT_FRIENDS");
  }

  const existing = await findDirectConversation(studentId, friendId);
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: studentId,
      members: {
        create: [{ studentId }, { studentId: friendId }],
      },
    },
    include: {
      members: { include: { student: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function createGroupConversation(
  studentId: string,
  name: string,
  memberIds: string[],
) {
  const friendIds = new Set(await getFriendIds(studentId));
  const uniqueMembers = [...new Set(memberIds)].filter(
    (id) => id !== studentId && friendIds.has(id),
  );

  if (uniqueMembers.length < 1) {
    throw new Error("NEED_FRIENDS");
  }

  return prisma.conversation.create({
    data: {
      type: "GROUP",
      name: name.trim().slice(0, 80),
      createdById: studentId,
      members: {
        create: [
          { studentId },
          ...uniqueMembers.map((id) => ({ studentId: id })),
        ],
      },
    },
    include: {
      members: { include: { student: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function conversationTitle(
  conversation: {
    type: string;
    name: string | null;
    members: { studentId: string; student: { displayName: string } }[];
  },
  currentStudentId: string,
) {
  if (conversation.type === "GROUP") {
    return conversation.name ?? "Group chat";
  }
  const other = conversation.members.find(
    (m) => m.studentId !== currentStudentId,
  );
  return other?.student.displayName ?? "Direct message";
}

export async function listConversationsForStudent(studentId: string) {
  const memberships = await prisma.conversationMember.findMany({
    where: { studentId },
    include: {
      conversation: {
        include: {
          members: { include: { student: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  return memberships.map((m) => {
    const lastMessage = m.conversation.messages[0] ?? null;
    const unread =
      lastMessage &&
      lastMessage.senderId !== studentId &&
      (!m.lastReadAt || lastMessage.createdAt > m.lastReadAt);

    return {
      id: m.conversation.id,
      type: m.conversation.type,
      title: conversationTitle(m.conversation, studentId),
      memberCount: m.conversation.members.length,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
          }
        : null,
      unread: Boolean(unread),
      updatedAt: m.conversation.updatedAt,
    };
  });
}

export async function listFriendsData(studentId: string) {
  const [friendships, incoming, outgoing] = await Promise.all([
    prisma.studentFriendship.findMany({
      where: {
        OR: [{ studentLowId: studentId }, { studentHighId: studentId }],
      },
    }),
    prisma.friendRequest.findMany({
      where: { toStudentId: studentId, status: "PENDING" },
      include: {
        fromStudent: {
          select: { id: true, displayName: true, schoolGrade: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { fromStudentId: studentId, status: "PENDING" },
      include: {
        toStudent: {
          select: { id: true, displayName: true, schoolGrade: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const friendIds = friendships.map((f) =>
    f.studentLowId === studentId ? f.studentHighId : f.studentLowId,
  );

  const friends = friendIds.length
    ? await prisma.studentProfile.findMany({
        where: { id: { in: friendIds }, activeStatus: true },
        select: {
          id: true,
          displayName: true,
          schoolGrade: true,
          streakDays: true,
        },
        orderBy: { displayName: "asc" },
      })
    : [];

  return {
    friends,
    incoming: incoming.map((r) => ({
      requestId: r.id,
      student: r.fromStudent,
      createdAt: r.createdAt,
    })),
    outgoing: outgoing.map((r) => ({
      requestId: r.id,
      student: r.toStudent,
      createdAt: r.createdAt,
    })),
  };
}
