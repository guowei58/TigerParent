import type { Problem } from "@/generated/prisma/client";

export type MissionPhaseName = "warmup" | "practice" | "mistakes" | "challenge";

export type MissionPhaseView = {
  name: MissionPhaseName;
  label: string;
  problems: Problem[];
  minutes: number;
};

export type MissionResumeState = {
  phaseIndex: number;
  problemIndex: number;
  allDone: boolean;
  attemptedCount: number;
  totalCount: number;
};

const PHASE_DONE_LABELS: Record<MissionPhaseName, string> = {
  warmup: "Warm-up complete!",
  practice: "Skill practice complete!",
  mistakes: "Mistake correction complete!",
  challenge: "Challenge complete!",
};

const PHASE_SKIP_LABELS: Record<MissionPhaseName, string> = {
  warmup: "Warm-up complete — nothing due right now.",
  practice: "Skill practice complete — moving on.",
  mistakes: "Mistake review complete — nothing to fix right now.",
  challenge: "Challenge complete — great work today!",
};

export function missionPhaseDoneMessage(phase: MissionPhaseView, skippedEmpty = false) {
  const base = skippedEmpty ? PHASE_SKIP_LABELS[phase.name] : PHASE_DONE_LABELS[phase.name];
  const nextIndex = missionPhaseOrder.indexOf(phase.name) + 1;
  const next = missionPhaseOrder[nextIndex];
  if (!next) return `${base} You finished today's mission!`;
  return `${base} Moving to ${nextPhaseLabel(next)}…`;
}

const missionPhaseOrder: MissionPhaseName[] = [
  "warmup",
  "practice",
  "mistakes",
  "challenge",
];

function nextPhaseLabel(name: MissionPhaseName) {
  switch (name) {
    case "warmup":
      return "Warm-Up Review";
    case "practice":
      return "Skill Practice";
    case "mistakes":
      return "Mistake Correction";
    case "challenge":
      return "Challenge Finish";
  }
}

export function computeMissionResumeState(
  phases: MissionPhaseView[],
  attemptedProblemIds: Set<string> | string[],
): MissionResumeState {
  const attempted = attemptedProblemIds instanceof Set
    ? attemptedProblemIds
    : new Set(attemptedProblemIds);

  let totalCount = 0;
  let attemptedCount = 0;

  for (const phase of phases) {
    totalCount += phase.problems.length;
    for (const problem of phase.problems) {
      if (attempted.has(problem.id)) attemptedCount += 1;
    }
  }

  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
    const phase = phases[phaseIndex];
    if (!phase.problems.length) continue;

    for (let problemIndex = 0; problemIndex < phase.problems.length; problemIndex++) {
      if (!attempted.has(phase.problems[problemIndex].id)) {
        return {
          phaseIndex,
          problemIndex,
          allDone: false,
          attemptedCount,
          totalCount,
        };
      }
    }
  }

  return {
    phaseIndex: Math.max(phases.length - 1, 0),
    problemIndex: 0,
    allDone: totalCount === 0 || attemptedCount >= totalCount,
    attemptedCount,
    totalCount,
  };
}

/** Skip empty phases and clamp to a valid problem slot. */
export function normalizeMissionPosition(
  phases: MissionPhaseView[],
  phaseIndex: number,
  problemIndex: number,
): { phaseIndex: number; problemIndex: number; allDone: boolean } {
  let pi = phaseIndex;
  let pji = problemIndex;

  while (pi < phases.length) {
    const phase = phases[pi];
    if (!phase.problems.length) {
      pi += 1;
      pji = 0;
      continue;
    }
    if (pji >= phase.problems.length) {
      pi += 1;
      pji = 0;
      continue;
    }
    return { phaseIndex: pi, problemIndex: pji, allDone: false };
  }

  return { phaseIndex: phases.length, problemIndex: 0, allDone: true };
}

export function findNextMissionPosition(
  phases: MissionPhaseView[],
  phaseIndex: number,
  problemIndex: number,
): { phaseIndex: number; problemIndex: number; allDone: boolean; skippedEmptyPhases: MissionPhaseView[] } {
  const skippedEmptyPhases: MissionPhaseView[] = [];
  let pi = phaseIndex;
  let pji = problemIndex + 1;

  while (pi < phases.length) {
    const phase = phases[pi];
    if (!phase.problems.length) {
      skippedEmptyPhases.push(phase);
      pi += 1;
      pji = 0;
      continue;
    }
    if (pji >= phase.problems.length) {
      pi += 1;
      pji = 0;
      continue;
    }
    return { phaseIndex: pi, problemIndex: pji, allDone: false, skippedEmptyPhases };
  }

  return { phaseIndex: pi, problemIndex: 0, allDone: true, skippedEmptyPhases };
}

export function buildMissionClientProps(
  phases: MissionPhaseView[],
  attemptedProblemIds: string[],
  completed: boolean,
) {
  const resume = computeMissionResumeState(phases, attemptedProblemIds);
  const normalized = normalizeMissionPosition(phases, resume.phaseIndex, resume.problemIndex);

  return {
    initialPhaseIndex: normalized.phaseIndex,
    initialProblemIndex: normalized.problemIndex,
    resumeAllDone: resume.allDone && !completed,
  };
}
