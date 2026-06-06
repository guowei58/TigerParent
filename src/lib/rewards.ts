export const STREAK_MILESTONE_PRESETS = [5, 10, 14, 30] as const;

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
  student: { streakDays: number },
): RewardGoalProgress {
  const targetValue = goal.streakDays ?? 0;
  const currentValue = student.streakDays;
  const remaining = Math.max(targetValue - currentValue, 0);
  const progressPercent =
    targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
  const cashLabel = formatCashReward(goal.cashRewardCents);

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
    progressLabel: `${currentValue} / ${targetValue} day streak`,
  };
}

export function defaultStreakTitle(days: number) {
  return `${days}-day streak reward`;
}
