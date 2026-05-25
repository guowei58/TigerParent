"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Problem } from "@/generated/prisma/client";
import { ProblemView } from "@/components/ProblemView";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar, Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";
import {
  findNextMissionPosition,
  missionPhaseDoneMessage,
  normalizeMissionPosition,
  type MissionPhaseView,
} from "@/lib/mission-progress";

type Phase = MissionPhaseView;

async function saveMissionProgress(
  sessionId: string,
  phaseIndex: number,
  problemIndex: number,
  phaseName: string,
) {
  try {
    await fetch(`/api/practice/${sessionId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseIndex, problemIndex, phaseName }),
    });
  } catch {
    // Non-blocking — attempts are the primary resume source.
  }
}

async function markMissionComplete(sessionId: string) {
  await fetch(`/api/practice/${sessionId}/complete`, { method: "POST" });
}

export function MissionClient({
  sessionId,
  phases,
  targetMinutes,
  completed,
  initialPhaseIndex,
  initialProblemIndex,
  resumeAllDone,
}: {
  sessionId: string;
  phases: Phase[];
  targetMinutes: number;
  completed: boolean;
  initialPhaseIndex: number;
  initialProblemIndex: number;
  resumeAllDone: boolean;
}) {
  const router = useRouter();
  const start = normalizeMissionPosition(phases, initialPhaseIndex, initialProblemIndex);

  const [phaseIndex, setPhaseIndex] = useState(start.allDone ? phases.length : start.phaseIndex);
  const [problemIndex, setProblemIndex] = useState(start.problemIndex);
  const [done, setDone] = useState(completed || resumeAllDone);
  const [totalXp, setTotalXp] = useState(0);
  const [sectionMessage, setSectionMessage] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalProblems = useMemo(
    () => phases.reduce((sum, phase) => sum + phase.problems.length, 0),
    [phases],
  );

  const currentPhase = phases[phaseIndex];
  const currentProblem = currentPhase?.problems[problemIndex];

  const completedBefore = useMemo(() => {
    let count = 0;
    for (let i = 0; i < phaseIndex; i++) count += phases[i]?.problems.length ?? 0;
    return count + problemIndex;
  }, [phaseIndex, problemIndex, phases]);

  const progress = totalProblems ? (completedBefore / totalProblems) * 100 : 0;

  const finishMission = useCallback(async () => {
    setDone(true);
    setSectionMessage(null);
    await markMissionComplete(sessionId);
  }, [sessionId]);

  const goToPosition = useCallback(
    (nextPhaseIndex: number, nextProblemIndex: number) => {
      const normalized = normalizeMissionPosition(phases, nextPhaseIndex, nextProblemIndex);
      if (normalized.allDone) {
        void finishMission();
        return;
      }
      setPhaseIndex(normalized.phaseIndex);
      setProblemIndex(normalized.problemIndex);
      void saveMissionProgress(
        sessionId,
        normalized.phaseIndex,
        normalized.problemIndex,
        phases[normalized.phaseIndex]?.name ?? "practice",
      );
    },
    [finishMission, phases, sessionId],
  );

  const showSectionCompleteAndContinue = useCallback(
    (message: string, nextPhaseIndex: number, nextProblemIndex: number) => {
      setSectionMessage(message);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        setSectionMessage(null);
        goToPosition(nextPhaseIndex, nextProblemIndex);
      }, 1800);
    },
    [goToPosition],
  );

  const advance = useCallback(() => {
    if (!currentPhase) {
      void finishMission();
      return;
    }

    const atEndOfPhase = problemIndex >= currentPhase.problems.length - 1;
    if (!atEndOfPhase) {
      const nextProblemIndex = problemIndex + 1;
      setProblemIndex(nextProblemIndex);
      void saveMissionProgress(sessionId, phaseIndex, nextProblemIndex, currentPhase.name);
      return;
    }

    const next = findNextMissionPosition(phases, phaseIndex, problemIndex);
    const skipped = next.skippedEmptyPhases;

    if (skipped.length > 0) {
      const lastSkipped = skipped[skipped.length - 1];
      showSectionCompleteAndContinue(
        missionPhaseDoneMessage(lastSkipped, true),
        next.allDone ? phases.length : next.phaseIndex,
        next.problemIndex,
      );
      return;
    }

    if (next.allDone) {
      showSectionCompleteAndContinue(
        missionPhaseDoneMessage(currentPhase, false),
        phases.length,
        0,
      );
      return;
    }

    showSectionCompleteAndContinue(
      missionPhaseDoneMessage(currentPhase, false),
      next.phaseIndex,
      next.problemIndex,
    );
  }, [
    currentPhase,
    finishMission,
    phaseIndex,
    phases,
    problemIndex,
    sessionId,
    showSectionCompleteAndContinue,
  ]);

  useEffect(() => {
    if (done || sectionMessage) return;

    const normalized = normalizeMissionPosition(phases, phaseIndex, problemIndex);
    if (normalized.allDone && totalProblems > 0) {
      void finishMission();
      return;
    }

    if (
      normalized.phaseIndex !== phaseIndex ||
      normalized.problemIndex !== problemIndex
    ) {
      const skippedPhase = phases[phaseIndex];
      if (skippedPhase && !skippedPhase.problems.length) {
        showSectionCompleteAndContinue(
          missionPhaseDoneMessage(skippedPhase, true),
          normalized.phaseIndex,
          normalized.problemIndex,
        );
      } else {
        goToPosition(normalized.phaseIndex, normalized.problemIndex);
      }
    }
  }, [
    done,
    finishMission,
    goToPosition,
    phaseIndex,
    phases,
    problemIndex,
    sectionMessage,
    showSectionCompleteAndContinue,
    totalProblems,
  ]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const handleSubmit = async (data: {
    answer: string;
    strokes: import("@/components/Scratchpad").Stroke[];
    elapsedSeconds: number;
    drawingSeconds: number;
  }) => {
    if (!currentProblem) return { isCorrect: false };

    const res = await fetch(`/api/practice/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: currentProblem.id,
        answer: data.answer,
        strokes: data.strokes,
        elapsedSeconds: data.elapsedSeconds,
        drawingSeconds: data.drawingSeconds,
      }),
    });
    const result = await res.json().catch(() => ({ error: "Submit failed" }));
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return {
          isCorrect: false,
          blocked: true,
          workFeedback: "Signing you in again…",
        };
      }
      const message =
        result.workFeedback ?? result.error ?? "Something went wrong. Try again.";
      return {
        isCorrect: false,
        blocked: true,
        workFeedback: message,
      };
    }
    if (result.xpEarned) setTotalXp((x) => x + result.xpEarned);
    return {
      isCorrect: result.isCorrect,
      explanation: result.explanation,
      roast: result.roast,
      workFeedback: result.workFeedback,
      workBonusXp: result.workBonusXp,
      placementChange: result.placementChange,
    };
  };

  if (done) {
    return (
      <Card className="text-center space-y-4">
        <p className="text-5xl">🎉</p>
        <CardTitle className="text-2xl">Mission Complete!</CardTitle>
        <p className="text-slate-500">
          You finished all sections for today. {totalXp > 0 ? `You earned ${totalXp} XP!` : "Great work!"}
        </p>
        <Button size="lg" onClick={() => router.push("/student")}>
          Back to Dashboard
        </Button>
      </Card>
    );
  }

  if (sectionMessage) {
    return (
      <Card className="text-center space-y-4 py-10">
        <p className="text-5xl">✓</p>
        <CardTitle className="text-xl">{sectionMessage}</CardTitle>
        <p className="text-slate-500 text-sm">Starting the next section…</p>
      </Card>
    );
  }

  if (!currentProblem) {
    return (
      <Card className="text-center space-y-4 py-10">
        <p className="text-4xl">✓</p>
        <CardTitle className="text-xl">Section complete!</CardTitle>
        <p className="text-slate-500">Moving you to the next part of today&apos;s mission…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="info">{currentPhase.label}</Badge>
        <span className="text-sm text-slate-500">{targetMinutes} min goal</span>
      </div>
      <ProgressBar value={progress} />
      <p className="text-sm text-slate-500">
        Problem {completedBefore + 1} of {totalProblems} · {totalXp} XP earned
      </p>

      <ProblemView
        key={currentProblem.id}
        problem={currentProblem}
        onSubmit={handleSubmit}
        onContinue={advance}
        continueLabel={
          problemIndex < currentPhase.problems.length - 1 ||
          phaseIndex < phases.length - 1
            ? "Next Problem"
            : "Finish Mission"
        }
      />
    </div>
  );
}
