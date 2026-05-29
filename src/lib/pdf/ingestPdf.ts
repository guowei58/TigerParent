import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import type { PdfIngestionStatus, PdfQuestionType } from "@/generated/prisma/client";
import { sanitizePdfText } from "./extractPdfText";
import { getPdfPageCount } from "./getPdfPageCount";
import { renderPdfPages } from "./renderPdfPages";
import {
  detectProblemsFromPages,
  detectProblemsOnePerPage,
  splitAnswerKeySection,
} from "./detectProblems";
import { parseAnswerChoices } from "./parseAnswerChoices";
import { inferQuestionType } from "./inferQuestionType";
import { parseAnswerKey } from "./parseAnswerKey";
import { cropProblemImages } from "./cropProblemImages";
import { cleanProblemText } from "@/lib/ai/cleanProblemText";
import { generateProblemExplanationWithAi } from "@/lib/ai/generateProblemExplanation";
import {
  ensureAiAnswerKeyForProblem,
  needsAiDerivedAnswerKey,
  saveSolutionFromExplanation,
  trustedAnswerKeyForAi,
} from "@/lib/pdf/aiAnswerKey";
import { classifyProblemConcept } from "@/lib/ai/classifyProblemConcept";
import { seedPracticeConcepts } from "@/lib/concepts/seedConcepts";
import {
  ensureDir,
  parsedAuditDir,
  pdfPagesDir,
} from "@/lib/storage/fileStorage";
import { problemDisplayImagePath } from "@/lib/pdf/displayPaths";

type IngestLog = { step: string; at: string; detail?: string };

async function updateJob(
  jobId: string,
  data: {
    status?: PdfIngestionStatus;
    currentStep?: string;
    progressPercent?: number;
    errorMessage?: string;
    logs?: IngestLog[];
    totals?: Partial<{
      totalPages: number;
      totalProblemsDetected: number;
      totalAnswerKeyEntriesDetected: number;
      totalAnswersMatched: number;
      totalProblemsClassified: number;
      totalExplanationsGenerated: number;
      totalProblemsNeedingReview: number;
    }>;
    completed?: boolean;
  },
) {
  const job = await prisma.pdfIngestionJob.findUnique({ where: { id: jobId } });
  const logs = [...((job?.logs as IngestLog[] | null) ?? []), ...(data.logs ?? [])];

  await prisma.pdfIngestionJob.update({
    where: { id: jobId },
    data: {
      status: data.status,
      currentStep: data.currentStep,
      progressPercent: data.progressPercent,
      errorMessage: data.errorMessage,
      logs: logs as never,
      completedAt: data.completed ? new Date() : undefined,
      totalPages: data.totals?.totalPages,
      totalProblemsDetected: data.totals?.totalProblemsDetected,
      totalAnswerKeyEntriesDetected: data.totals?.totalAnswerKeyEntriesDetected,
      totalAnswersMatched: data.totals?.totalAnswersMatched,
      totalProblemsClassified: data.totals?.totalProblemsClassified,
      totalExplanationsGenerated: data.totals?.totalExplanationsGenerated,
      totalProblemsNeedingReview: data.totals?.totalProblemsNeedingReview,
    },
  });
}

export async function runPdfIngestion(sourceDocumentId: string, jobId: string) {
  const doc = await prisma.pdfSourceDocument.findUniqueOrThrow({
    where: { id: sourceDocumentId },
  });

  const log = (step: string, detail?: string) => ({
    logs: [{ step, at: new Date().toISOString(), detail }],
  });

  try {
    await seedPracticeConcepts();
    let concepts = await prisma.practiceConcept.findMany({
      where: { subject: doc.subject ?? "math", gradeLevel: doc.gradeLevel ?? undefined },
    });
    // Taxonomy is grade-5 today; still classify lower-grade PDFs into those topics.
    if (concepts.length === 0) {
      concepts = await prisma.practiceConcept.findMany({
        where: { subject: doc.subject ?? "math" },
        orderBy: { sortOrder: "asc" },
      });
    }

    await updateJob(jobId, {
      status: "rendering_pages",
      currentStep: "rendering_pages",
      progressPercent: 5,
      ...log("rendering_pages"),
    });

    const pagesOut = pdfPagesDir(sourceDocumentId);
    const pdfPageTotal = await getPdfPageCount(doc.originalFilePath);
    const rendered = await renderPdfPages(
      doc.originalFilePath,
      pagesOut,
      1.5,
      async (done) => {
        const pct = 5 + Math.floor((done / Math.max(1, pdfPageTotal)) * 10);
        await updateJob(jobId, {
          progressPercent: Math.min(14, pct),
          currentStep: `rendering_pages (${done}/${pdfPageTotal})`,
        });
      },
    );

    await updateJob(jobId, {
      status: "extracting_text",
      currentStep: "extracting_text",
      progressPercent: 15,
      ...log("extracting_text"),
    });

    const { extractPdfText, extractPdfTextByPage } = await import("./extractPdfText");
    const pageTexts = await extractPdfTextByPage(doc.originalFilePath);
    const pageImageMap = new Map<
      number,
      { path: string; width: number; height: number }
    >();

    for (const r of rendered) {
      pageImageMap.set(r.pageNumber, {
        path: r.imagePath,
        width: r.imageWidth,
        height: r.imageHeight,
      });
      const text = sanitizePdfText(
        pageTexts.find((p) => p.pageNumber === r.pageNumber)?.text ??
          (r.pageNumber === 1 ? await extractPdfText(doc.originalFilePath) : ""),
      );
      await prisma.pdfPage.upsert({
        where: {
          sourceDocumentId_pageNumber: {
            sourceDocumentId,
            pageNumber: r.pageNumber,
          },
        },
        create: {
          sourceDocumentId,
          pageNumber: r.pageNumber,
          textRaw: text,
          imagePath: r.imagePath,
          imageWidth: r.imageWidth,
          imageHeight: r.imageHeight,
        },
        update: {
          textRaw: text,
          imagePath: r.imagePath,
          imageWidth: r.imageWidth,
          imageHeight: r.imageHeight,
        },
      });
    }

    await prisma.pdfSourceDocument.update({
      where: { id: sourceDocumentId },
      data: { pageCount: rendered.length },
    });

    await updateJob(jobId, {
      status: "detecting_problem_regions",
      currentStep: "detecting_problem_regions",
      progressPercent: 30,
      totals: { totalPages: rendered.length },
      ...log("detecting_problem_regions"),
    });

    const pagesForDetect = pageTexts.length
      ? pageTexts.map((p) => ({ pageNumber: p.pageNumber, text: p.text }))
      : [{ pageNumber: 1, text: await extractPdfText(doc.originalFilePath) }];

    const layout = doc.ingestionLayout ?? "one_problem_per_page";
    const answerKeyPageCount = doc.answerKeyPageCount ?? 1;

    let regions;
    let answerKeySection: string;

    if (layout === "one_problem_per_page") {
      const detected = detectProblemsOnePerPage(pagesForDetect, answerKeyPageCount);
      regions = detected.regions;
      answerKeySection = detected.answerKeySection;
      await updateJob(jobId, {
        ...log(
          "detecting_problem_regions",
          `one_per_page: ${detected.problemPageCount} problems, ${detected.answerKeyPageCount} answer pages`,
        ),
      });
    } else {
      regions = detectProblemsFromPages(pagesForDetect);
      answerKeySection = splitAnswerKeySection(
        pagesForDetect.map((p) => p.text).join("\n"),
      ).answerKeySection;
    }

    const detectedNumbers = regions.map((r) => r.problemNumber);
    await prisma.pdfPracticeProblem.deleteMany({
      where: {
        sourceDocumentId,
        problemNumber: { notIn: detectedNumbers.length > 0 ? detectedNumbers : [-1] },
      },
    });

    await updateJob(jobId, {
      status: "cropping_problem_images",
      currentStep: "cropping_problem_images",
      progressPercent: 45,
      totals: { totalPages: rendered.length, totalProblemsDetected: regions.length },
      ...log("cropping_problem_images", `${regions.length} problems`),
    });

    const crops = await cropProblemImages(sourceDocumentId, regions, pageImageMap);

    await updateJob(jobId, {
      status: "parsing_problems",
      currentStep: "parsing_problems",
      progressPercent: 55,
      ...log("parsing_problems"),
    });

    for (let i = 0; i < regions.length; i++) {
      if (i % 5 === 0 || i === regions.length - 1) {
        await updateJob(jobId, {
          progressPercent: 55 + Math.floor(((i + 1) / Math.max(1, regions.length)) * 10),
          currentStep: `parsing_problems (${i + 1}/${regions.length})`,
        });
      }
      const region = regions[i]!;
      const crop = crops.find((c) => c.problemNumber === region.problemNumber);
      const cleaned = sanitizePdfText(cleanProblemText(region.rawText));
      const rawText = sanitizePdfText(region.rawText);
      const choices = parseAnswerChoices(region.rawText);

      await prisma.pdfPracticeProblem.upsert({
        where: {
          sourceDocumentId_problemNumber: {
            sourceDocumentId,
            problemNumber: region.problemNumber,
          },
        },
        create: {
          sourceDocumentId,
          problemNumber: region.problemNumber,
          sourcePageStart: region.pageNumber,
          rawText,
          cleanedText: cleaned,
          questionType: region.questionType as PdfQuestionType,
          gradeLevel: doc.gradeLevel,
          subject: doc.subject,
          requiresImage: region.requiresImage,
          studentDisplayMode: crop?.studentDisplayMode ?? "full_page_with_problem_number",
          problemImagePath: crop?.problemImagePath,
          fullPageImagePath: crop?.fullPageImagePath,
          cropX: crop?.cropX,
          cropY: crop?.cropY,
          cropWidth: crop?.cropWidth,
          cropHeight: crop?.cropHeight,
          extractionConfidence: region.confidence,
          parseStatus: "parsed",
          parseWarnings: [...region.parseWarnings, ...(crop?.warnings ?? [])],
        },
        update: {
          rawText,
          cleanedText: cleaned,
          questionType: region.questionType as PdfQuestionType,
          problemImagePath: crop?.problemImagePath,
          fullPageImagePath: crop?.fullPageImagePath,
          extractionConfidence: region.confidence,
          parseWarnings: [...region.parseWarnings, ...(crop?.warnings ?? [])],
        },
      });

      const problem = await prisma.pdfPracticeProblem.findUniqueOrThrow({
        where: {
          sourceDocumentId_problemNumber: {
            sourceDocumentId,
            problemNumber: region.problemNumber,
          },
        },
      });

      await prisma.pdfAnswerChoice.deleteMany({ where: { problemId: problem.id } });
      for (const ch of choices) {
        await prisma.pdfAnswerChoice.create({
          data: {
            problemId: problem.id,
            label: ch.label,
            text: ch.text,
            sortOrder: ch.sortOrder,
          },
        });
      }
    }

    await updateJob(jobId, {
      status: "parsing_answer_key",
      currentStep: "parsing_answer_key",
      progressPercent: 65,
      ...log("parsing_answer_key"),
    });

    const keyEntries = parseAnswerKey(answerKeySection);
    for (const entry of keyEntries) {
      await prisma.pdfAnswerKeyEntry.upsert({
        where: {
          sourceDocumentId_problemNumber: {
            sourceDocumentId,
            problemNumber: entry.problemNumber,
          },
        },
        create: {
          sourceDocumentId,
          problemNumber: entry.problemNumber,
          rawAnswerText: entry.rawAnswerText,
          correctChoiceLabel: entry.correctChoiceLabel,
          correctAnswerText: entry.correctAnswerText,
          extractionConfidence: entry.extractionConfidence,
          warnings: entry.warnings,
        },
        update: {
          rawAnswerText: entry.rawAnswerText,
          correctChoiceLabel: entry.correctChoiceLabel,
          correctAnswerText: entry.correctAnswerText,
          extractionConfidence: entry.extractionConfidence,
        },
      });
    }

    await updateJob(jobId, {
      status: "matching_answers",
      currentStep: "matching_answers",
      progressPercent: 72,
      totals: {
        totalProblemsDetected: regions.length,
        totalAnswerKeyEntriesDetected: keyEntries.length,
      },
      ...log("matching_answers"),
    });

    let matched = 0;
    const problems = await prisma.pdfPracticeProblem.findMany({
      where: { sourceDocumentId },
    });
    for (const p of problems) {
      const key = await prisma.pdfAnswerKeyEntry.findUnique({
        where: {
          sourceDocumentId_problemNumber: {
            sourceDocumentId,
            problemNumber: p.problemNumber,
          },
        },
      });
      if (key) {
        matched++;
        const choiceCount = await prisma.pdfAnswerChoice.count({
          where: { problemId: p.id },
        });
        const questionType = inferQuestionType({
          rawText: p.rawText ?? "",
          correctChoiceLabel: key.correctChoiceLabel,
          correctAnswerText: key.correctAnswerText,
          choiceCount,
        }) as PdfQuestionType;
        await prisma.pdfPracticeProblem.update({
          where: { id: p.id },
          data: {
            answerKeyConfidence: key.extractionConfidence,
            questionType,
          },
        });
      } else {
        await prisma.pdfPracticeProblem.update({
          where: { id: p.id },
          data: {
            parseWarnings: [
              ...((p.parseWarnings as string[]) ?? []),
              "No answer key entry matched",
            ],
          },
        });
      }
    }

    await updateJob(jobId, {
      status: "classifying_concepts",
      currentStep: "classifying_concepts",
      progressPercent: 82,
      totals: { totalAnswersMatched: matched },
      ...log("classifying_concepts"),
    });

    let classified = 0;
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i]!;
      if (i % 5 === 0 || i === problems.length - 1) {
        await updateJob(jobId, {
          progressPercent: 82 + Math.floor(((i + 1) / Math.max(1, problems.length)) * 8),
          currentStep: `classifying_concepts (${i + 1}/${problems.length})`,
        });
      }
      const classification = classifyProblemConcept(
        p.cleanedText ?? "",
        concepts,
        p.gradeLevel ?? doc.gradeLevel ?? 5,
      );
      const concept = concepts.find((c) => c.slug === classification.primaryConceptSlug);
      if (concept) {
        await prisma.pdfPracticeProblem.update({
          where: { id: p.id },
          data: {
            primaryConceptId: concept.id,
            topic: classification.topic,
            subtopic: classification.subtopic,
            conceptConfidence: classification.classificationConfidence,
          },
        });
        await prisma.pdfProblemConcept.upsert({
          where: { problemId_conceptId: { problemId: p.id, conceptId: concept.id } },
          create: {
            problemId: p.id,
            conceptId: concept.id,
            isPrimary: true,
            confidence: classification.classificationConfidence,
            classificationMethod: "ai",
            reasoning: classification.reasoning,
          },
          update: { isPrimary: true, confidence: classification.classificationConfidence },
        });
        classified++;
      }
    }

    await updateJob(jobId, {
      status: "generating_explanations",
      currentStep: "generating_explanations",
      progressPercent: 90,
      totals: { totalProblemsClassified: classified },
      ...log("generating_explanations"),
    });

    let explanations = 0;
    let needsReview = 0;
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i]!;
      if (i % 3 === 0 || i === problems.length - 1) {
        await updateJob(jobId, {
          progressPercent: 90 + Math.floor(((i + 1) / Math.max(1, problems.length)) * 9),
          currentStep: `generating_explanations (${i + 1}/${problems.length})`,
        });
      }
      const key = await prisma.pdfAnswerKeyEntry.findUnique({
        where: {
          sourceDocumentId_problemNumber: {
            sourceDocumentId,
            problemNumber: p.problemNumber,
          },
        },
      });
      const choices = await prisma.pdfAnswerChoice.findMany({
        where: { problemId: p.id },
        orderBy: { sortOrder: "asc" },
      });
      const choiceRows = choices.map((c) => ({ label: c.label, text: c.text }));
      const needsAi = needsAiDerivedAnswerKey(p.questionType, choiceRows, key);

      if (needsAi) {
        try {
          await ensureAiAnswerKeyForProblem({
            id: p.id,
            sourceDocumentId,
            problemNumber: p.problemNumber,
            questionType: p.questionType,
            rawText: p.rawText,
            cleanedText: p.cleanedText,
            gradeLevel: p.gradeLevel ?? doc.gradeLevel ?? 5,
            subject: p.subject ?? doc.subject ?? "math",
            subtopic: p.subtopic,
            choices: choiceRows,
            key: key
              ? {
                  id: key.id,
                  correctChoiceLabel: key.correctChoiceLabel,
                  correctAnswerText: key.correctAnswerText,
                  rawAnswerText: key.rawAnswerText,
                }
              : null,
          });
          explanations++;
        } catch (err) {
          console.error(`[ingest] AI answer key failed #${p.problemNumber}`, err);
          needsReview++;
        }
      } else {
        const trusted = trustedAnswerKeyForAi(key, false);
        const expl = await generateProblemExplanationWithAi({
          cleanedText: p.rawText ?? p.cleanedText ?? "",
          choices: choiceRows,
          correctChoiceLabel: trusted.correctChoiceLabel,
          correctAnswerText: trusted.correctAnswerText,
          gradeLevel: p.gradeLevel ?? doc.gradeLevel ?? 5,
          subject: p.subject ?? doc.subject ?? "math",
          conceptName: p.subtopic ?? undefined,
          problemImagePath: problemDisplayImagePath(p),
        });

        const genStatus =
          !key ? "needs_human_review" : expl.confidence < 0.5 ? "needs_human_review" : "generated";

        await saveSolutionFromExplanation(
          p.id,
          key!.id,
          expl,
          key,
          false,
        );

        if (genStatus !== "generated" || !key || p.requiresImage) needsReview++;
        else explanations++;
      }
    }

    const audit = {
      sourceDocumentId,
      fileName: doc.fileName,
      hash: doc.sha256Hash,
      pageCount: rendered.length,
      problemsDetected: regions.length,
      answerKeyEntries: keyEntries.length,
      answersMatched: matched,
      explanationsGenerated: explanations,
      needsReview,
    };

    ensureDir(parsedAuditDir());
    const auditPath = path.join(
      parsedAuditDir(),
      `${doc.fileName.replace(/[^a-z0-9._-]+/gi, "_")}.audit.json`,
    );
    fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));

    await prisma.pdfSourceDocument.update({
      where: { id: sourceDocumentId },
      data: { importStatus: "needs_review" },
    });

    await updateJob(jobId, {
      status: "needs_review",
      currentStep: "completed",
      progressPercent: 100,
      errorMessage: undefined,
      completed: true,
      totals: {
        totalPages: rendered.length,
        totalProblemsDetected: regions.length,
        totalAnswerKeyEntriesDetected: keyEntries.length,
        totalAnswersMatched: matched,
        totalProblemsClassified: classified,
        totalExplanationsGenerated: explanations,
        totalProblemsNeedingReview: needsReview,
      },
      ...log("completed", auditPath),
    });

    return audit;
  } catch (e) {
    const msg = (e as Error).message;
    await updateJob(jobId, {
      status: "failed",
      errorMessage: msg,
      ...log("failed", msg),
    });
    await prisma.pdfSourceDocument.update({
      where: { id: sourceDocumentId },
      data: { importStatus: "failed" },
    });
    throw e;
  }
}

export { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";
