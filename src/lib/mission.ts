import type { Problem, ProblemType } from "@/generated/prisma/client";
import { resolveChoiceAnswer } from "@/lib/mcq-choices";
import { prisma } from "./db";
import { getDueReviewItems, getMistakesForReview } from "./review";
import {
  loadProblemsByIds,
  selectFreshProblemIdsForStudent,
  recordProblemExposures,
} from "./problem-selection";

export type MissionPhase = "warmup" | "practice" | "mistakes" | "challenge";

type MissionPhaseJson = {
  currentPhase?: MissionPhase;
  reviewSkillIds?: string[];
  mistakeSkillIds?: string[];
  mistakeProblemIds?: string[];
  primarySkillId?: string;
  primarySubjectId?: string;
  warmupProblemIds?: string[];
  practiceProblemIds?: string[];
  mistakesProblemIds?: string[];
  challengeProblemIds?: string[];
};

const PHASE_COUNTS: Record<MissionPhase, number> = {
  warmup: 3,
  practice: 8,
  mistakes: 3,
  challenge: 2,
};

function phaseIdsKey(phase: MissionPhase): keyof MissionPhaseJson {
  switch (phase) {
    case "warmup":
      return "warmupProblemIds";
    case "practice":
      return "practiceProblemIds";
    case "mistakes":
      return "mistakesProblemIds";
    case "challenge":
      return "challengeProblemIds";
  }
}

async function selectProblemIdsForPhase(
  studentId: string,
  phase: MissionPhase,
  phaseData: MissionPhaseJson,
  excludeProblemIds: string[] = [],
  sessionId?: string,
): Promise<string[]> {
  const count = PHASE_COUNTS[phase];
  const sessionType = phase === "challenge" ? "MASTERY_CHALLENGE" : "DAILY_MISSION";
  const base = { studentId, count, excludeProblemIds, sessionType, sessionId };

  if (phase === "warmup" && phaseData.reviewSkillIds?.length) {
    return selectFreshProblemIdsForStudent({
      ...base,
      skillIds: phaseData.reviewSkillIds,
      usageTypes: ["REVIEW", "CONCEPT_PRACTICE"],
    });
  }

  if (phase === "mistakes" && phaseData.mistakeSkillIds?.length) {
    return selectFreshProblemIdsForStudent({
      ...base,
      skillIds: phaseData.mistakeSkillIds,
      usageTypes: ["FLUENCY_DRILL", "CONCEPT_PRACTICE"],
    });
  }

  if (phaseData.primarySkillId) {
    return selectFreshProblemIdsForStudent({
      ...base,
      skillId: phaseData.primarySkillId,
      usageTypes:
        phase === "challenge"
          ? ["CHALLENGE", "OFFICIAL_STYLE", "OFFICIAL_RELEASED"]
          : phase === "practice"
            ? ["CONCEPT_PRACTICE", "FLUENCY_DRILL", "REVIEW"]
            : undefined,
    });
  }

  return [];
}

async function migrateLegacyMissionPhaseData(
  phaseData: MissionPhaseJson,
): Promise<MissionPhaseJson> {
  if (phaseData.mistakeSkillIds?.length || !phaseData.mistakeProblemIds?.length) {
    return phaseData;
  }

  const rows = await prisma.problem.findMany({
    where: { id: { in: phaseData.mistakeProblemIds } },
    select: { skillId: true },
  });

  return {
    ...phaseData,
    mistakeSkillIds: [...new Set(rows.map((r) => r.skillId))],
  };
}

async function ensureMissionPhaseProblems(
  sessionId: string,
  studentId: string,
  phaseData: MissionPhaseJson,
): Promise<MissionPhaseJson> {
  const phases: MissionPhase[] = ["warmup", "practice", "mistakes", "challenge"];
  let next = await migrateLegacyMissionPhaseData(phaseData);
  let updated = false;
  const reserved = new Set<string>();
  const newlyExposed: string[] = [];

  for (const phase of phases) {
    const key = phaseIdsKey(phase);
    const required = PHASE_COUNTS[phase];
    const previous = (next[key] as string[] | undefined) ?? [];
    let ids = previous.filter((id) => !reserved.has(id));

    if (ids.length < required) {
      const fresh = await selectProblemIdsForPhase(studentId, phase, next, [
        ...reserved,
        ...ids,
      ], sessionId);
      ids = [...ids, ...fresh];
    }

    ids = ids.filter((id) => !reserved.has(id)).slice(0, required);
    for (const id of ids) reserved.add(id);

    for (const id of ids) {
      if (!previous.includes(id)) newlyExposed.push(id);
    }

    if (ids.length !== previous.length || ids.some((id, i) => id !== previous[i])) {
      (next as Record<string, string[]>)[key] = ids;
      updated = true;
    }
  }

  if (newlyExposed.length) {
    await recordProblemExposures(studentId, newlyExposed, sessionId);
  }

  if (updated) {
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { phaseJson: next },
    });
  }

  return next;
}

export async function getOrCreateTodayMission(
  studentId: string,
  subjectId: string,
) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      placements: {
        include: {
          subject: true,
          currentSkill: true,
        },
      },
    },
  });

  const placement = student.placements.find((p) => p.subjectId === subjectId);
  if (!placement) {
    throw new Error("No placement for subject");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaysMissions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      sessionType: "DAILY_MISSION",
      startedAt: { gte: startOfDay },
    },
    orderBy: { startedAt: "desc" },
  });

  const existing = todaysMissions.find(
    (s) =>
      ((s.phaseJson ?? {}) as MissionPhaseJson).primarySubjectId === subjectId,
  );

  if (existing) {
    const phaseData = (existing.phaseJson ?? {}) as MissionPhaseJson;
    await ensureMissionPhaseProblems(existing.id, studentId, phaseData);
    return existing;
  }

  const reviewItems = await getDueReviewItems(studentId, 3, subjectId);
  const mistakes = await getMistakesForReview(studentId, 3, subjectId);

  const phaseJson: MissionPhaseJson = {
    currentPhase: "warmup",
    reviewSkillIds: reviewItems.map((r) => r.skillId),
    mistakeSkillIds: [...new Set(mistakes.map((m) => m.problem.skillId))],
    primarySkillId: placement.currentSkillId ?? undefined,
    primarySubjectId: subjectId,
  };

  const session = await prisma.practiceSession.create({
    data: {
      studentId,
      sessionType: "DAILY_MISSION",
      targetMinutes: student.dailyGoalMinutes,
      phaseJson,
    },
  });

  await ensureMissionPhaseProblems(session.id, studentId, phaseJson);
  return session;
}

export async function getMissionProblems(
  sessionId: string,
  phase: MissionPhase,
  count: number,
) {
  const session = await prisma.practiceSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  const phaseData = await ensureMissionPhaseProblems(
    sessionId,
    session.studentId,
    (session.phaseJson ?? {}) as MissionPhaseJson,
  );

  const key = phaseIdsKey(phase);
  const storedIds = (phaseData[key] as string[] | undefined) ?? [];
  const problems = await loadProblemsByIds(storedIds);

  return problems.slice(0, count);
}

export function checkAnswer(problem: Problem, answer: string): boolean {
  const normalized = normalizeAnswerText(answer);
  const acceptable = [
    problem.correctAnswer,
    ...parseAcceptableAnswers(problem.acceptableAnswersJson),
  ].map(normalizeAnswerText);

  if (problem.type === "NUMERIC") {
    const numA = parseNumeric(normalized);
    if (numA === null) return false;
    return acceptable.some((candidate) => {
      const numB = parseNumeric(candidate);
      return numB !== null && Math.abs(numA - numB) < 0.001;
    });
  }

  if (problem.type === "MULTIPLE_CHOICE") {
    if (
      resolveChoiceAnswer(answer, {
        id: problem.id,
        correctAnswer: problem.correctAnswer,
        correctChoiceId: problem.correctChoiceId,
        choicesWithIdsJson: problem.choicesWithIdsJson,
        choicesJson: problem.choicesJson,
      })
    ) {
      return true;
    }
    return acceptable.some(
      (candidate) =>
        normalized === candidate ||
        normalized === candidate.charAt(0) ||
        candidate.startsWith(normalized),
    );
  }

  if (problem.type === "SHORT_ANSWER" || problem.type === "WRITTEN_RESPONSE") {
    return acceptable.some((candidate) => {
      if (normalized === candidate) return true;
      if (candidate.length >= 8 && normalized.includes(candidate)) return true;
      if (normalized.length >= 8 && candidate.includes(normalized)) return true;
      return false;
    });
  }

  return acceptable.some((candidate) => normalized === candidate);
}

function normalizeAnswerText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseNumeric(value: string) {
  const num = parseFloat(value.replace(/[^0-9.\-/]/g, ""));
  return Number.isNaN(num) ? null : num;
}

function parseAcceptableAnswers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

export function normalizeProblemType(type: ProblemType) {
  return type;
}
