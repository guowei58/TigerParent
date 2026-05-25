export const XP_PER_LEVEL = 100;

export const STREAK_MILESTONE_PRESETS = [5, 10, 14, 30] as const;

export function xpLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpProgressInLevel(xp: number) {
  return xp % XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number) {
  return XP_PER_LEVEL - xpProgressInLevel(xp);
}

export function formatCashReward(cents: number | null | undefined) {
  if (!cents || cents <= 0) return null;
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export type RewardGoalProgress = {
  id: string;
  goalType: "XP" | "STREAK";
  title: string;
  description: string | null;
  xpRequired: number | null;
  streakDays: number | null;
  cashRewardCents: number | null;
  cashLabel: string | null;
  currentValue: number;
  targetValue: number;
  remaining: number;
  progressPercent: number;
  reached: boolean;
  redeemed: boolean;
  redeemedAt: Date | null;
  progressLabel: string;
};

type GoalRow = {
  id: string;
  goalType: "XP" | "STREAK";
  title: string;
  description: string | null;
  xpRequired: number | null;
  streakDays: number | null;
  cashRewardCents: number | null;
  redeemed: boolean;
  redeemedAt: Date | null;
};

export function buildGoalProgress(
  goal: GoalRow,
  student: { xp: number; streakDays: number },
): RewardGoalProgress {
  const isStreak = goal.goalType === "STREAK";
  const targetValue = isStreak
    ? (goal.streakDays ?? 0)
    : (goal.xpRequired ?? 0);
  const currentValue = isStreak ? student.streakDays : student.xp;
  const remaining = Math.max(targetValue - currentValue, 0);
  const progressPercent =
    targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
  const cashLabel = formatCashReward(goal.cashRewardCents);

  const progressLabel = isStreak
    ? `${currentValue} / ${targetValue} day streak`
    : `${currentValue} / ${targetValue} XP`;

  return {
    id: goal.id,
    goalType: goal.goalType,
    title: goal.title,
    description: goal.description,
    xpRequired: goal.xpRequired,
    streakDays: goal.streakDays,
    cashRewardCents: goal.cashRewardCents,
    cashLabel,
    currentValue,
    targetValue,
    remaining,
    progressPercent,
    reached: currentValue >= targetValue && targetValue > 0,
    redeemed: goal.redeemed,
    redeemedAt: goal.redeemedAt,
    progressLabel,
  };
}

export function describeXpUses() {
  return [
    {
      title: "Level up",
      detail: `Every ${XP_PER_LEVEL} XP raises your Tiger Level on the Tiger Leaderboard.`,
    },
    {
      title: "Earn parent rewards",
      detail:
        "Parents set streak and XP milestones in Settings — hit them to earn treats or cash.",
    },
    {
      title: "Climb the Tiger Leaderboard",
      detail: "XP is one of several stats that determine your rank among the tigers.",
    },
  ];
}

export function defaultStreakTitle(days: number) {
  return `${days}-day streak reward`;
}

export function defaultXpCashTitle(xp: number, cents: number) {
  const cash = formatCashReward(cents);
  return cash ? `${xp} XP → ${cash}` : `${xp} XP reward`;
}
