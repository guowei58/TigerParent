import type { MistakeType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export function inferMistakeType(input: {
  isCorrect: boolean;
  elapsedSeconds: number;
  targetSeconds: number;
  mistakeCategory?: string | null;
  showedWork?: boolean | null;
}): MistakeType {
  if (input.isCorrect) return "UNKNOWN";

  const cat = (input.mistakeCategory ?? "").toLowerCase();
  if (cat.includes("careless") || cat.includes("copy")) return "CARELESS";
  if (cat.includes("comprehension") || cat.includes("reading")) return "COMPREHENSION";
  if (cat.includes("procedure") || cat.includes("step")) return "PROCEDURAL";
  if (cat.includes("concept") || cat.includes("misconception")) return "CONCEPTUAL";

  if (input.elapsedSeconds > 0 && input.elapsedSeconds < input.targetSeconds * 0.35) {
    return "GUESSING";
  }
  if (input.elapsedSeconds > input.targetSeconds * 1.75) {
    return "SPEED";
  }
  if (input.showedWork === false) return "CARELESS";

  return "CONCEPTUAL";
}

export async function logMistakeFromAttempt(input: {
  attemptId: string;
  studentId: string;
  problemId: string;
  assignmentId?: string | null;
  skillId?: string | null;
  standardCode?: string | null;
  studentAnswer: string;
  correctAnswer: string;
  explanation?: string | null;
  mistakeType: MistakeType;
}) {
  if (input.mistakeType === "UNKNOWN") return null;

  return prisma.mistakeLog.create({
    data: {
      studentId: input.studentId,
      problemId: input.problemId,
      assignmentId: input.assignmentId ?? undefined,
      attemptId: input.attemptId,
      skillId: input.skillId ?? undefined,
      standardCode: input.standardCode ?? undefined,
      mistakeType: input.mistakeType,
      studentAnswer: input.studentAnswer,
      correctAnswer: input.correctAnswer,
      explanation: input.explanation ?? undefined,
      needsRetake: true,
      retakeScheduledAt: new Date(),
    },
  });
}

export async function getOpenMistakes(studentId: string, limit = 50) {
  return prisma.mistakeLog.findMany({
    where: { studentId, needsRetake: true, resolvedAt: null },
    include: {
      problem: { select: { prompt: true, skillId: true, explanation: true } },
      assignment: { select: { title: true, assignmentType: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function resolveMistake(mistakeLogId: string, studentId: string) {
  return prisma.mistakeLog.updateMany({
    where: { id: mistakeLogId, studentId },
    data: { needsRetake: false, resolvedAt: new Date() },
  });
}

export async function getMistakeStats(studentId: string) {
  const rows = await prisma.mistakeLog.findMany({
    where: { studentId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    select: { mistakeType: true, needsRetake: true },
  });

  const byType: Record<string, number> = {};
  let open = 0;
  for (const row of rows) {
    byType[row.mistakeType] = (byType[row.mistakeType] ?? 0) + 1;
    if (row.needsRetake) open += 1;
  }

  return { byType, open, total: rows.length };
}
