import type { ProblemUsageType, ProblemContentClass } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { computeProblemConfidence } from "@/lib/content-provenance/confidence";
import { contentClassForSourceType } from "@/lib/content-provenance/import-pipeline";
import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { skillKey } from "../../prisma/curriculum-data";

export type SkillContext = {
  mathSubjectId: string;
  englishSubjectId: string;
  skillsById: Map<
    string,
    { id: string; title: string; nominalGradeLevel: number | null; subjectId: string }
  >;
};

export async function loadSkillContext(): Promise<SkillContext> {
  const subjects = await prisma.subject.findMany();
  const math = subjects.find((s) => s.slug === "math");
  const english = subjects.find((s) => s.slug === "english");
  if (!math || !english) throw new Error("Math/English subjects missing — run db:seed first");

  const skills = await prisma.skill.findMany({
    select: { id: true, title: true, nominalGradeLevel: true, subjectId: true },
  });
  return {
    mathSubjectId: math.id,
    englishSubjectId: english.id,
    skillsById: new Map(skills.map((s) => [s.id, s])),
  };
}

const WORD_PROBLEM_TITLES: Record<number, string> = {
  1: "Simple Word Problems",
  2: "Addition Facts to 20",
  3: "One-Step Word Problems",
  4: "Multi-Step Word Problems",
  5: "Multi-Step Word Problems",
  6: "Multi-Step Word Problems",
  7: "Multi-Step Word Problems",
  8: "Multi-Step Word Problems",
  9: "Multi-Step Word Problems",
  10: "Multi-Step Word Problems",
  11: "Multi-Step Word Problems",
  12: "Multi-Step Word Problems",
};

export function inferGradeFromSteps(steps: number): number {
  if (steps <= 2) return 3;
  if (steps <= 4) return 5;
  if (steps <= 6) return 7;
  return 8;
}

export function resolveMathSkillId(ctx: SkillContext, grade: number, title?: string): string {
  const skillTitle = title ?? WORD_PROBLEM_TITLES[grade] ?? "Multi-Step Word Problems";
  const id = skillKey("math", grade, skillTitle);
  if (ctx.skillsById.has(id)) return id;
  const fallback = skillKey("math", grade, "One-Step Word Problems");
  if (ctx.skillsById.has(fallback)) return fallback;
  const any = [...ctx.skillsById.values()].find(
    (s) => s.subjectId === ctx.mathSubjectId && s.nominalGradeLevel === grade,
  );
  if (any) return any.id;
  throw new Error(`No math skill for grade ${grade}`);
}

export function resolveEnglishSkillId(ctx: SkillContext, grade: number, title = "Main Idea"): string {
  const id = skillKey("english", grade, title);
  if (ctx.skillsById.has(id)) return id;
  const any = [...ctx.skillsById.values()].find(
    (s) => s.subjectId === ctx.englishSubjectId && s.nominalGradeLevel === grade,
  );
  if (any) return any.id;
  throw new Error(`No english skill for grade ${grade}`);
}

export function countGsm8kSteps(answer: string): number {
  const body = answer.split("####")[0] ?? answer;
  return body.split("\n").filter((l) => /^\s*\d/.test(l.trim()) || /<<|>>/.test(l)).length || 2;
}

export function parseGsm8kFinalAnswer(answer: string): string {
  const m = answer.match(/####\s*([\d,\.\-\$]+)/);
  return m?.[1]?.replace(/,/g, "").replace(/\$/g, "") ?? answer.trim();
}

export type BulkImportOptions = {
  autoApprove?: boolean;
  usageType?: ProblemUsageType;
  batchNotes?: string;
};

export async function bulkImportProblems(
  sourceId: string,
  items: ImportItemInput[],
  options: BulkImportOptions = {},
) {
  const source = await prisma.contentSource.findUniqueOrThrow({ where: { id: sourceId } });
  if (!source.importAllowed) throw new Error(`Import not allowed: ${sourceId}`);

  const contentClass = contentClassForSourceType(source.sourceType);
  const usageType =
    options.usageType ??
    (source.sourceType === "OFFICIAL_RELEASED" ? "OFFICIAL_RELEASED" : "CHALLENGE");

  const batch = await prisma.contentImportBatch.create({
    data: {
      sourceId,
      itemCount: items.length,
      status: "PENDING",
      notes: options.batchNotes,
    },
  });

  let imported = 0;
  let skipped = 0;

  const CHUNK = 10;

  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await prisma.$transaction(
      async (tx) => {
        for (const item of chunk) {
        const existing = item.sourceQuestionId
          ? await tx.problem.findFirst({
              where: { sourceId, sourceQuestionId: item.sourceQuestionId },
            })
          : null;
        if (existing) {
          skipped++;
          continue;
        }

        const confidence = computeProblemConfidence({
          contentClass,
          provenanceStatus: options.autoApprove ? "VERIFIED" : "NEEDS_REVIEW",
          copyrightStatus:
            source.sourceType === "OFFICIAL_RELEASED" ? "PUBLIC_RELEASED" : "LICENSED",
          reviewStatus: options.autoApprove ? "APPROVED" : "NEEDS_REVIEW",
          explanation: item.explanation,
          correctAnswer: item.correctAnswer,
          sourceId: source.id,
          sourceName: source.name,
          usageType,
          type: item.type,
          choicesJson: item.choices,
        });

        const approved = options.autoApprove && confidence.level !== "NEEDS_REVIEW";

        const problem = await tx.problem.create({
          data: {
            skillId: item.skillId,
            subjectId: item.subjectId,
            type: item.type,
            prompt: item.prompt,
            choicesJson: item.choices ?? undefined,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            gradeLevel: item.gradeLevel,
            difficulty: item.difficulty ?? 5,
            teksCode: item.sourceStandardCode?.match(/^\d\.\d/) ? item.sourceStandardCode : undefined,
            contentClass,
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.url ?? undefined,
            sourceQuestionId: item.sourceQuestionId,
            sourceYear: item.sourceYear,
            sourceExam: item.sourceExam,
            sourceGradeLevel: item.sourceGradeLevel ?? item.gradeLevel,
            sourceStandardCode: item.sourceStandardCode,
            provenanceStatus: approved ? "VERIFIED" : "NEEDS_REVIEW",
            copyrightStatus:
              source.sourceType === "OFFICIAL_RELEASED" ? "PUBLIC_RELEASED" : "LICENSED",
            reviewStatus: approved ? "APPROVED" : "NEEDS_REVIEW",
            studentReady: approved,
            canShowToStudent: approved,
            approved,
            attributionText: item.attributionText ?? source.attributionText ?? source.name,
            usageType: usageType as ProblemUsageType,
            sourceType: "IMPORTED",
            confidenceScore: confidence.score,
            confidenceLevel: confidence.level,
            cognitiveLevel: item.type === "MULTIPLE_CHOICE" ? "APPLICATION" : "MULTI_STEP",
          },
        });

        await tx.$executeRaw`
          INSERT INTO "ProblemStandardAlignment" ("id", "problemId", "standardId", "alignmentStrength")
          SELECT md5(${problem.id} || sa."standardId"), ${problem.id}, sa."standardId", 'PRIMARY'::"AlignmentStrength"
          FROM "SkillStandardAlignment" sa
          WHERE sa."skillId" = ${item.skillId} AND sa."alignmentStrength" = 'PRIMARY'
          ON CONFLICT ("problemId", "standardId") DO NOTHING
        `;

        if (item.sourceStandardCode) {
          const std = await tx.curriculumStandard.findFirst({
            where: {
              OR: [
                { standardCode: item.sourceStandardCode },
                { standardCode: { contains: item.sourceStandardCode.slice(-5) } },
              ],
            },
          });
          if (std) {
            await tx.$executeRaw`
              INSERT INTO "ProblemStandardAlignment" ("id", "problemId", "standardId", "alignmentStrength")
              VALUES (md5(${problem.id} || ${std.id}), ${problem.id}, ${std.id}, 'PRIMARY'::"AlignmentStrength")
              ON CONFLICT ("problemId", "standardId") DO NOTHING
            `;
          }
        }

        await tx.contentImportItem.create({
          data: {
            batchId: batch.id,
            rawJson: item,
            normalizedJson: item,
            problemId: problem.id,
            status: approved ? "APPROVED" : "NEEDS_REVIEW",
          },
        });

        imported++;
      }
    },
      { timeout: 120_000 },
    );
    process.stdout.write(`\r  imported ${imported}/${items.length} (skipped ${skipped})`);
  }

  console.log("");
  await prisma.contentImportBatch.update({
    where: { id: batch.id },
    data: { status: imported ? "APPROVED" : "NEEDS_REVIEW", itemCount: imported },
  });

  return { batchId: batch.id, imported, skipped };
}
