import { prisma } from "@/lib/db";
import type { ContentSourceRegistryType, ProblemContentClass } from "@/generated/prisma/client";
import { computeProblemConfidence } from "./confidence";
import { importedProblemApprovalRequirements } from "./gate";

export type RegisterSourceInput = {
  name: string;
  sourceType: ContentSourceRegistryType;
  publisher?: string;
  url?: string;
  licenseType?: string;
  termsUrl?: string;
  allowedUseNotes?: string;
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  redistributionAllowed?: boolean;
  importAllowed?: boolean;
};

export function contentClassForSourceType(
  sourceType: ContentSourceRegistryType,
): ProblemContentClass {
  switch (sourceType) {
    case "OFFICIAL_RELEASED":
      return "OFFICIAL_RELEASED";
    case "LICENSED":
    case "OER":
    case "HUMAN_AUTHORED":
    case "USER_UPLOADED":
      return "LICENSED_OR_OER";
    default:
      return "GENERATED";
  }
}

export async function registerContentSource(input: RegisterSourceInput) {
  return prisma.contentSource.create({ data: input });
}

export type ImportItemInput = {
  sourceQuestionId?: string;
  sourceYear?: number;
  sourceExam?: string;
  sourceGradeLevel?: number;
  sourceStandardCode?: string;
  subjectSlug: string;
  skillId: string;
  subjectId: string;
  gradeLevel: number;
  type: "MULTIPLE_CHOICE" | "NUMERIC" | "SHORT_ANSWER" | "WRITTEN_RESPONSE";
  prompt: string;
  choices?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty?: number;
  usageType?: string;
  attributionText?: string;
};

export async function importContentBatch(
  sourceId: string,
  items: ImportItemInput[],
  importedByUserId?: string,
) {
  const source = await prisma.contentSource.findUniqueOrThrow({
    where: { id: sourceId },
  });
  if (!source.importAllowed) {
    throw new Error("Import not allowed for this source");
  }

  const batch = await prisma.contentImportBatch.create({
    data: {
      sourceId,
      importedByUserId,
      itemCount: items.length,
      status: "PENDING",
    },
  });

  const contentClass = contentClassForSourceType(source.sourceType);

  for (const item of items) {
    const importItem = await prisma.contentImportItem.create({
      data: {
        batchId: batch.id,
        rawJson: item,
        status: "PENDING",
      },
    });

    const normalized = {
      ...item,
      contentClass,
      sourceName: source.name,
      sourceUrl: source.url,
      copyrightStatus:
        source.sourceType === "OFFICIAL_RELEASED" ? "PUBLIC_RELEASED" : "LICENSED",
      provenanceStatus: "NEEDS_REVIEW",
      reviewStatus: "NEEDS_REVIEW",
      studentReady: false,
      canShowToStudent: false,
    };

    const missing = importedProblemApprovalRequirements({
      contentClass,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      gradeLevel: item.gradeLevel,
      sourceId: source.id,
      sourceName: source.name,
      standardAlignmentsCount: item.sourceStandardCode ? 1 : 0,
    });

    const problem = await prisma.problem.create({
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
        contentClass,
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url ?? undefined,
        sourceQuestionId: item.sourceQuestionId,
        sourceYear: item.sourceYear,
        sourceExam: item.sourceExam,
        sourceGradeLevel: item.sourceGradeLevel ?? item.gradeLevel,
        sourceStandardCode: item.sourceStandardCode,
        provenanceStatus: "NEEDS_REVIEW",
        copyrightStatus:
          source.sourceType === "OFFICIAL_RELEASED" ? "PUBLIC_RELEASED" : "LICENSED",
        reviewStatus: "NEEDS_REVIEW",
        studentReady: false,
        canShowToStudent: false,
        approved: false,
        attributionText: item.attributionText ?? source.name,
        usageType:
          source.sourceType === "OFFICIAL_RELEASED" ? "OFFICIAL_RELEASED" : "CONCEPT_PRACTICE",
        sourceType: "IMPORTED",
      },
    });

    const confidence = computeProblemConfidence({
      contentClass,
      provenanceStatus: "NEEDS_REVIEW",
      copyrightStatus:
        source.sourceType === "OFFICIAL_RELEASED" ? "PUBLIC_RELEASED" : "LICENSED",
      reviewStatus: "NEEDS_REVIEW",
      explanation: item.explanation,
      correctAnswer: item.correctAnswer,
      sourceId: source.id,
      sourceName: source.name,
      usageType: "CONCEPT_PRACTICE",
      type: item.type,
      choicesJson: item.choices,
    });

    await prisma.problem.update({
      where: { id: problem.id },
      data: {
        confidenceScore: confidence.score,
        confidenceLevel: confidence.level,
      },
    });

    await prisma.contentImportItem.update({
      where: { id: importItem.id },
      data: {
        normalizedJson: normalized,
        problemId: problem.id,
        status: missing.length ? "NEEDS_REVIEW" : "NORMALIZED",
        reviewNotes: missing.length
          ? `Missing before approval: ${missing.join(", ")}`
          : "Awaiting admin review",
      },
    });
  }

  await prisma.contentImportBatch.update({
    where: { id: batch.id },
    data: { status: "NEEDS_REVIEW" },
  });

  return batch;
}

/** STAAR importer structure — manual/approved JSON only; no scraping. */
export type StaarImportItem = ImportItemInput & {
  teksStandard?: string;
  itemRationale?: string;
  studentExpectation?: string;
};

export function normalizeStaarItem(item: StaarImportItem): ImportItemInput {
  return {
    ...item,
    sourceExam: item.sourceExam ?? "STAAR",
    sourceStandardCode: item.sourceStandardCode ?? item.teksStandard,
    explanation: item.explanation || item.itemRationale || "",
    attributionText: item.attributionText ?? "Texas Education Agency — STAAR released item",
  };
}

/** SAT official-style structure — only for permitted manual imports. */
export type SatImportItem = ImportItemInput & {
  satDomain?: string;
  itemRationale?: string;
};

export function normalizeSatImportItem(item: SatImportItem): ImportItemInput {
  return {
    ...item,
    sourceExam: item.sourceExam ?? "SAT Practice",
    explanation: item.explanation || item.itemRationale || "",
    usageType: item.usageType,
    attributionText:
      item.attributionText ??
      "College Board / Khan Academy — use only with permitted license terms",
  };
}

export async function approveImportedProblem(problemId: string, reviewerNotes?: string) {
  const problem = await prisma.problem.findUniqueOrThrow({
    where: { id: problemId },
    include: { standardAlignments: true, contentSource: true },
  });

  const missing = importedProblemApprovalRequirements({
    contentClass: problem.contentClass,
    correctAnswer: problem.correctAnswer,
    explanation: problem.explanation,
    gradeLevel: problem.gradeLevel,
    sourceId: problem.sourceId,
    sourceName: problem.sourceName,
    standardAlignmentsCount: problem.standardAlignments.length,
  });

  if (missing.length) {
    throw new Error(`Cannot approve: missing ${missing.join(", ")}`);
  }

  const confidence = computeProblemConfidence({
    contentClass: problem.contentClass,
    provenanceStatus: "VERIFIED",
    copyrightStatus: problem.copyrightStatus,
    reviewStatus: "APPROVED",
    explanation: problem.explanation,
    correctAnswer: problem.correctAnswer,
    sourceId: problem.sourceId,
    sourceName: problem.sourceName,
    usageType: problem.usageType,
    type: problem.type,
    choicesJson: problem.choicesJson,
    distractorRationaleJson: problem.distractorRationaleJson,
    answerValidationMethod: problem.answerValidationMethod,
    aiGenerated: problem.aiGenerated,
  });

  return prisma.problem.update({
    where: { id: problemId },
    data: {
      provenanceStatus: "VERIFIED",
      reviewStatus: confidence.level === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "APPROVED",
      approved: confidence.level !== "NEEDS_REVIEW",
      studentReady: confidence.level !== "NEEDS_REVIEW",
      canShowToStudent: confidence.level !== "NEEDS_REVIEW",
      confidenceScore: confidence.score,
      confidenceLevel: confidence.level,
    },
  });
}

export async function refreshProblemConfidence(problemId: string) {
  const problem = await prisma.problem.findUniqueOrThrow({
    where: { id: problemId },
    include: { performanceStats: true },
  });

  const confidence = computeProblemConfidence({
    contentClass: problem.contentClass,
    provenanceStatus: problem.provenanceStatus,
    copyrightStatus: problem.copyrightStatus,
    reviewStatus: problem.reviewStatus,
    explanation: problem.explanation,
    correctAnswer: problem.correctAnswer,
    sourceId: problem.sourceId,
    sourceName: problem.sourceName,
    usageType: problem.usageType,
    type: problem.type,
    choicesJson: problem.choicesJson,
    distractorRationaleJson: problem.distractorRationaleJson,
    answerValidationMethod: problem.answerValidationMethod,
    aiGenerated: problem.aiGenerated,
    performanceCorrectRate: problem.performanceStats?.correctRate,
  });

  return prisma.problem.update({
    where: { id: problemId },
    data: {
      confidenceScore: confidence.score,
      confidenceLevel: confidence.level,
    },
  });
}
