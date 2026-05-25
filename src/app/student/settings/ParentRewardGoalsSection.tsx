"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Badge";
import {
  STREAK_MILESTONE_PRESETS,
  type RewardGoalProgress,
} from "@/lib/rewards";

type ParentRewardGoalsSectionProps = {
  studentXp: number;
  streakDays: number;
  dailyGoalMinutes: number;
  targetAheadMonths: number;
  activeGoals: RewardGoalProgress[];
};

export function ParentRewardGoalsSection({
  studentXp,
  streakDays,
  dailyGoalMinutes,
  targetAheadMonths,
  activeGoals: initialGoals,
}: ParentRewardGoalsSectionProps) {
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);
  const [dailyGoal, setDailyGoal] = useState(String(dailyGoalMinutes));
  const [aheadMonths, setAheadMonths] = useState(String(targetAheadMonths));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [streakPresets, setStreakPresets] = useState<
    Record<number, { reward: string; dollars: string; enabled: boolean }>
  >(() => {
    const base: Record<
      number,
      { reward: string; dollars: string; enabled: boolean }
    > = {};
    for (const days of STREAK_MILESTONE_PRESETS) {
      const existing = initialGoals.find(
        (g) => g.goalType === "STREAK" && g.streakDays === days,
      );
      base[days] = {
        reward: existing?.title ?? "",
        dollars: existing?.cashRewardCents
          ? String(existing.cashRewardCents / 100)
          : "",
        enabled: Boolean(existing),
      };
    }
    return base;
  });

  const [xpRewardRows, setXpRewardRows] = useState<
    { xp: string; dollars: string; label: string }[]
  >(() => {
    const xpGoals = initialGoals.filter((g) => g.goalType === "XP");
    if (xpGoals.length) {
      return xpGoals.map((g) => ({
        xp: String(g.xpRequired ?? ""),
        dollars: g.cashRewardCents ? String(g.cashRewardCents / 100) : "",
        label: g.cashRewardCents ? "" : g.title,
      }));
    }
    return [
      { xp: "500", dollars: "5", label: "" },
      { xp: "1000", dollars: "10", label: "" },
    ];
  });

  const refreshGoals = async () => {
    const res = await fetch("/api/student/reward-goals");
    if (res.ok) {
      const data = await res.json();
      setGoals(data.activeGoals ?? []);
    }
    router.refresh();
  };

  const savePractice = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/student/reward-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "savePractice",
        dailyGoalMinutes: parseInt(dailyGoal, 10),
        targetAheadMonths: parseInt(aheadMonths, 10),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not save practice targets");
      return;
    }
    setMessage("Practice targets saved.");
  };

  const saveAllMilestones = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    for (const days of STREAK_MILESTONE_PRESETS) {
      const preset = streakPresets[days];
      if (!preset?.enabled) continue;
      const res = await fetch("/api/student/reward-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          goalType: "STREAK",
          streakDays: days,
          title: preset.reward.trim() || `${days}-day streak reward`,
          cashRewardCents: preset.dollars
            ? Math.round(parseFloat(preset.dollars) * 100)
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Could not save ${days}-day streak goal`);
        setLoading(false);
        return;
      }
    }

    for (const row of xpRewardRows) {
      const xp = parseInt(row.xp, 10);
      if (!Number.isFinite(xp) || xp < 50) continue;
      const dollars = row.dollars.trim();
      const res = await fetch("/api/student/reward-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          goalType: "XP",
          xpRequired: xp,
          title:
            row.label.trim() ||
            (dollars
              ? `${xp} XP → $${dollars}`
              : `${xp} XP reward`),
          cashRewardCents: dollars
            ? Math.round(parseFloat(dollars) * 100)
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save XP reward");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setMessage("Reward milestones saved! Your student can see them on Rewards.");
    await refreshGoals();
  };

  const redeemGoal = async (goalId: string) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/student/reward-goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, action: "redeem" }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not mark as given");
      return;
    }
    setMessage("Reward marked as given.");
    await refreshGoals();
  };

  const removeGoal = async (goalId: string) => {
    setLoading(true);
    await fetch("/api/student/reward-goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, action: "delete" }),
    });
    setLoading(false);
    await refreshGoals();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Parent: Reward Goals</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Set streak and XP milestones. Students see progress on the Rewards
          page — include cash amounts when XP earns money.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Current: {studentXp} XP · {streakDays}-day streak
        </p>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">Practice targets</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daily minutes">
            <input
              type="number"
              min={10}
              max={120}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </Field>
          <Field label="Months ahead">
            <input
              type="number"
              min={0}
              max={12}
              value={aheadMonths}
              onChange={(e) => setAheadMonths(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </Field>
        </div>
        <Button size="sm" variant="secondary" onClick={savePractice} disabled={loading}>
          Save practice targets
        </Button>
      </Card>

      <Card className="space-y-4">
        <CardTitle className="text-base">Streak rewards</CardTitle>
        <p className="text-xs text-slate-500">
          e.g. 5 days = treat, 10 days = bigger reward
        </p>
        {STREAK_MILESTONE_PRESETS.map((days) => (
          <div
            key={days}
            className="rounded-xl border border-slate-200 p-3 space-y-2"
          >
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={streakPresets[days]?.enabled ?? false}
                onChange={(e) =>
                  setStreakPresets((prev) => ({
                    ...prev,
                    [days]: {
                      ...prev[days],
                      enabled: e.target.checked,
                    },
                  }))
                }
              />
              {days}-day streak
            </label>
            {streakPresets[days]?.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Reward (movie night…)"
                  value={streakPresets[days]?.reward ?? ""}
                  onChange={(e) =>
                    setStreakPresets((prev) => ({
                      ...prev,
                      [days]: { ...prev[days], reward: e.target.value },
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm col-span-2"
                />
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Cash ($ optional)"
                  value={streakPresets[days]?.dollars ?? ""}
                  onChange={(e) =>
                    setStreakPresets((prev) => ({
                      ...prev,
                      [days]: { ...prev[days], dollars: e.target.value },
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <CardTitle className="text-base">XP → money rewards</CardTitle>
        <p className="text-xs text-slate-500">
          When XP hits the target, the student earns the cash amount.
        </p>
        {xpRewardRows.map((row, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="XP"
              value={row.xp}
              onChange={(e) => {
                const next = [...xpRewardRows];
                next[i] = { ...next[i], xp: e.target.value };
                setXpRewardRows(next);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step={0.5}
              placeholder="$"
              value={row.dollars}
              onChange={(e) => {
                const next = [...xpRewardRows];
                next[i] = { ...next[i], dollars: e.target.value };
                setXpRewardRows(next);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Or fun reward name"
              value={row.label}
              onChange={(e) => {
                const next = [...xpRewardRows];
                next[i] = { ...next[i], label: e.target.value };
                setXpRewardRows(next);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setXpRewardRows([...xpRewardRows, { xp: "", dollars: "", label: "" }])
          }
        >
          + Add XP row
        </Button>
      </Card>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <Button onClick={saveAllMilestones} disabled={loading} className="w-full">
        {loading ? "Saving…" : "Save reward milestones"}
      </Button>

      {goals.length > 0 && (
        <Card className="space-y-3">
          <CardTitle className="text-base">Active milestones</CardTitle>
          {goals.map((g) => (
            <div key={g.id} className="rounded-xl bg-slate-50 p-3 space-y-2">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium">{g.title}</p>
                  {g.cashLabel && (
                    <p className="text-sm text-emerald-700">{g.cashLabel}</p>
                  )}
                  <p className="text-xs text-slate-500">{g.progressLabel}</p>
                </div>
                <span className="text-xs uppercase text-slate-400">
                  {g.goalType}
                </span>
              </div>
              <ProgressBar value={g.progressPercent} />
              <div className="flex flex-wrap gap-2">
                {g.reached && !g.redeemed && (
                  <Button size="sm" onClick={() => redeemGoal(g.id)}>
                    Mark given
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => removeGoal(g.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
