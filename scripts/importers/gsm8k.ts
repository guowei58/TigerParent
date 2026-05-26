import fs from "fs";
import readline from "readline";
import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import {
  bulkImportProblems,
  countGsm8kSteps,
  inferGradeFromSteps,
  loadSkillContext,
  parseGsm8kFinalAnswer,
  resolveMathSkillId,
  type SkillContext,
} from "../lib/import-helpers";

type Gsm8kRow = { question: string; answer: string };

function readJsonl(path: string): Gsm8kRow[] {
  const lines = fs.readFileSync(path, "utf8").trim().split("\n");
  return lines.map((line) => JSON.parse(line) as Gsm8kRow);
}

function toImportItem(
  row: Gsm8kRow,
  ctx: SkillContext,
  split: "train" | "test",
  index: number,
): ImportItemInput {
  const steps = countGsm8kSteps(row.answer);
  const grade = inferGradeFromSteps(steps);
  const skillId = resolveMathSkillId(ctx, grade);
  const finalAnswer = parseGsm8kFinalAnswer(row.answer);
  const solution = row.answer.split("####")[0]?.trim() ?? row.answer;

  return {
    sourceQuestionId: `gsm8k-${split}-${index}`,
    sourceExam: "GSM8K",
    sourceGradeLevel: grade,
    subjectSlug: "math",
    subjectId: ctx.mathSubjectId,
    skillId,
    gradeLevel: grade,
    type: "NUMERIC",
    prompt: row.question.trim(),
    correctAnswer: finalAnswer,
    explanation: solution,
    difficulty: Math.min(10, 3 + steps),
    usageType: "CHALLENGE",
    attributionText: "OpenAI GSM8K dataset (MIT license)",
  };
}

export async function importGsm8k(options?: { limit?: number; autoApprove?: boolean }) {
  const ctx = await loadSkillContext();
  const trainPath = "data/imports/gsm8k-train.jsonl";
  const testPath = "data/imports/gsm8k-test.jsonl";

  if (!fs.existsSync(trainPath)) {
    throw new Error("Missing GSM8K train file — run download first");
  }

  const items: ImportItemInput[] = [];
  const train = readJsonl(trainPath);
  const test = fs.existsSync(testPath) ? readJsonl(testPath) : [];

  train.forEach((row, i) => items.push(toImportItem(row, ctx, "train", i)));
  test.forEach((row, i) => items.push(toImportItem(row, ctx, "test", i)));

  const limited = options?.limit ? items.slice(0, options.limit) : items;
  console.log(`GSM8K: importing ${limited.length} word problems...`);

  return bulkImportProblems("gsm8k", limited, {
    autoApprove: options?.autoApprove ?? true,
    usageType: "CHALLENGE",
    batchNotes: "GSM8K MIT dataset — challenge/word problems",
  });
}
