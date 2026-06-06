import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildGoalProgress,
  defaultStreakTitle,
} from "@/lib/rewards";
import {
  getActiveRewardGoals,
  getStudentRewardGoals,
} from "@/lib/leaderboard";

async function studentSnapshot(studentId: string) {
  return prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: {
      streakDays: true,
      dailyGoalMinutes: true,
      targetAheadMonths: true,
    },
  });
}

function mapGoals(
  goals: Awaited<ReturnType<typeof getActiveRewardGoals>>,
  student: { streakDays: number },
) {
  return goals
    .filter((g) => g.goalType === "STREAK")
    .map((g) => buildGoalProgress(g, student));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const student = await studentSnapshot(studentId);

  const [activeGoals, history] = await Promise.all([
    getActiveRewardGoals(studentId),
    getStudentRewardGoals(studentId),
  ]);

  return NextResponse.json({
    streakDays: student.streakDays,
    dailyGoalMinutes: student.dailyGoalMinutes,
    targetAheadMonths: student.targetAheadMonths,
    activeGoals: mapGoals(activeGoals, student),
    history: history
      .filter((g) => g.goalType === "STREAK")
      .map((g) => buildGoalProgress(g, student)),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const body = await request.json();
  const action = String(body.action ?? "create");

  if (action === "savePractice") {
    const dailyGoalMinutes = Math.round(Number(body.dailyGoalMinutes));
    const targetAheadMonths = Math.round(Number(body.targetAheadMonths));
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        dailyGoalMinutes: Math.min(120, Math.max(10, dailyGoalMinutes)),
        targetAheadMonths: Math.min(12, Math.max(0, targetAheadMonths)),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "create") {
    if (body.goalType !== "STREAK") {
      return NextResponse.json({ error: "Only streak goals are supported" }, { status: 400 });
    }

    const title = String(body.title ?? "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;
    const cashRewardCents = body.cashRewardCents
      ? Math.round(Number(body.cashRewardCents))
      : null;

    const streakDays = Math.round(Number(body.streakDays));
    if (!Number.isFinite(streakDays) || streakDays < 1 || streakDays > 365) {
      return NextResponse.json(
        { error: "Streak must be between 1 and 365 days" },
        { status: 400 },
      );
    }

    const resolvedTitle = title || defaultStreakTitle(streakDays);

    const goal = await prisma.studentRewardGoal.create({
      data: {
        studentId,
        goalType: "STREAK",
        title: resolvedTitle,
        description,
        xpRequired: null,
        streakDays,
        cashRewardCents:
          cashRewardCents && cashRewardCents > 0 ? cashRewardCents : null,
        active: true,
      },
    });

    const student = await studentSnapshot(studentId);
    return NextResponse.json({
      goal: buildGoalProgress(goal, student),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.studentProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.studentProfileId;
  const body = await request.json();
  const goalId = String(body.goalId ?? "");
  const action = String(body.action ?? "redeem");

  if (!goalId) {
    return NextResponse.json({ error: "goalId is required" }, { status: 400 });
  }

  const goal = await prisma.studentRewardGoal.findFirst({
    where: { id: goalId, studentId },
  });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  if (action === "delete") {
    await prisma.studentRewardGoal.update({
      where: { id: goalId },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "redeem") {
    const student = await studentSnapshot(studentId);
    const progress = buildGoalProgress(goal, student);
    if (!progress.reached) {
      return NextResponse.json(
        { error: "Student has not reached this milestone yet" },
        { status: 400 },
      );
    }

    const updated = await prisma.studentRewardGoal.update({
      where: { id: goalId },
      data: { redeemed: true, redeemedAt: new Date(), active: false },
    });

    return NextResponse.json({
      goal: buildGoalProgress(updated, student),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
