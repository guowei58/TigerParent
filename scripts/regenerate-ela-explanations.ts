/**
 * Re-run AI explanations for ELA reading passage problems.
 * Passes full passage text + question; does not anchor to PDF answer key so
 * wrong keys and paragraph-mismatch explanations can be corrected.
 *
 * Usage:
 *   npx tsx --import dotenv/config scripts/regenerate-ela-explanations.ts
 *   npx tsx --import dotenv/config scripts/regenerate-ela-explanations.ts --limit 5
 *   npx tsx --import dotenv/config scripts/regenerate-ela-explanations.ts --resume
 *   npx tsx --import dotenv/config scripts/regenerate-ela-explanations.ts --doc "2025_grade3_ela"
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";
import { generateExplanationFromProblemImage } from "../src/lib/ai/visionExplanation";
import { getGeminiVisionConfig, getOpenAiVisionConfig } from "../src/lib/ai/visionExplanation";
import { generateProblemExplanationWithAi } from "../src/lib/ai/generateProblemExplanation";
import { problemDisplayImagePath } from "../src/lib/pdf/displayPaths";
import { isMcqQuestion } from "../src/lib/pdf/isMcqQuestion";
import { textLooksLikeMcq } from "../src/lib/pdf/inferQuestionType";

const GENERIC_SNIPPET = "step-by-step solution was not auto-generated";
const GENERIC_MODELS = ["key-only", "key-only+vision-failed", "rule-based"];
const LOG_PATH = path.join(process.cwd(), "data", "imports", "regen-ela-explanations.log");
const DELAY_MS = 2500;

function isGenericSolution(s: {
  generatedByModel: string | null;
  explanationStepByStep: string;
  confidence: number | null;
}): boolean {
  const model = s.generatedByModel ?? "";
  return (
    GENERIC_MODELS.some((m) => model.includes(m)) ||
    s.explanationStepByStep.includes(GENERIC_SNIPPET) ||
    (s.confidence != null && s.confidence <= 0.45 && model.includes("key"))
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let resume = false;
  let docFilter: string | null = null;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1]!, 10);
    if (args[i] === "--resume") resume = true;
    if (args[i] === "--all") all = true;
    if (args[i] === "--doc" && args[i + 1]) docFilter = args[i + 1]!;
  }
  return { limit, resume, docFilter, all };
}

function logLine(line: string) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, line + "\n");
  console.log(line);
}

async function main() {
  const { limit, resume, docFilter, all } = parseArgs();
  const doneIds = new Set<string>();

  if (resume && fs.existsSync(LOG_PATH)) {
    for (const line of fs.readFileSync(LOG_PATH, "utf8").split("\n")) {
      const m = line.match(/^OK\s+(\S+)/);
      if (m) doneIds.add(m[1]!);
    }
    logLine(`Resuming — ${doneIds.size} already completed`);
  }

  logLine(
    `ELA regen: gemini=${getGeminiVisionConfig()?.model ?? "none"} openai=${getOpenAiVisionConfig()?.model ?? "none"}`,
  );

  const problems = await prisma.pdfPracticeProblem.findMany({
    where: {
      passageId: { not: null },
      ...(docFilter
        ? { sourceDocument: { fileName: { contains: docFilter, mode: "insensitive" } } }
        : {}),
    },
    orderBy: [{ sourceDocumentId: "asc" }, { problemNumber: "asc" }],
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
      solution: true,
      passage: { select: { bodyText: true, title: true } },
      sourceDocument: { select: { title: true, fileName: true } },
    },
  });

  const targets = problems.filter((p) => {
    if (doneIds.has(p.id)) return false;
    if (all) return true;
    return !p.solution || isGenericSolution(p.solution);
  });

  logLine(
    `Found ${targets.length} ELA targets (${problems.length} with passages${all ? ", --all" : ""})`,
  );

  let processed = 0;
  let fixed = 0;
  let keyChanges = 0;
  let stillGeneric = 0;
  let errors = 0;

  for (const p of targets) {
    if (processed >= limit) break;

    const key = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: p.sourceDocumentId,
          problemNumber: p.problemNumber,
        },
      },
    });

    const img = problemDisplayImagePath(p);
    const choiceRows = p.choices.map((c) => ({ label: c.label, text: c.text }));
    const passageText = p.passage?.bodyText ?? null;
    const questionText = p.rawText ?? p.cleanedText ?? "";

    if (processed > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    const label = `[${processed + 1}/${Math.min(limit, targets.length)}] ${p.sourceDocument.fileName} #${p.problemNumber}`;

    try {
      const input = {
        cleanedText: questionText,
        choices: choiceRows,
        correctChoiceLabel: null,
        correctAnswerText: null,
        gradeLevel: p.gradeLevel ?? 5,
        subject: p.subject ?? "english",
        conceptName: p.subtopic ?? p.passage?.title ?? undefined,
        problemImagePath: img,
        passageText,
      };

      let expl =
        img != null
          ? await generateExplanationFromProblemImage(input, img, null)
          : null;

      if (!expl) {
        expl = await generateProblemExplanationWithAi(input);
      }

      const stillGenericResult = isGenericSolution({
        generatedByModel: expl.modelUsed,
        explanationStepByStep: expl.explanationStepByStep,
        confidence: expl.confidence,
      });

      if (stillGenericResult) {
        stillGeneric++;
        logLine(`STILL-GENERIC ${p.id} ${label} model=${expl.modelUsed}`);
        processed++;
        continue;
      }

      const aiLetter = expl.correctChoiceLabel?.trim().toUpperCase() ?? null;
      const pdfLetter = key?.correctChoiceLabel?.trim().toUpperCase() ?? null;
      const mcq =
        isMcqQuestion(p.questionType, choiceRows) ||
        Boolean(aiLetter && /^[A-D]$/.test(aiLetter)) ||
        textLooksLikeMcq(questionText);

      let keyId = key?.id;
      if (mcq && aiLetter && /^[A-D]$/.test(aiLetter)) {
        if (pdfLetter && pdfLetter !== aiLetter) {
          keyChanges++;
          logLine(`KEY-FIX ${p.id} ${label} ${pdfLetter} → ${aiLetter}`);
        }
        const entry = await prisma.pdfAnswerKeyEntry.upsert({
          where: {
            sourceDocumentId_problemNumber: {
              sourceDocumentId: p.sourceDocumentId,
              problemNumber: p.problemNumber,
            },
          },
          create: {
            sourceDocumentId: p.sourceDocumentId,
            problemNumber: p.problemNumber,
            rawAnswerText: aiLetter,
            correctChoiceLabel: aiLetter,
            correctAnswerText: expl.correctAnswerText || aiLetter,
            extractionConfidence: expl.confidence,
            warnings:
              pdfLetter && pdfLetter !== aiLetter ? ["Corrected by ELA passage regen"] : [],
          },
          update: {
            rawAnswerText: aiLetter,
            correctChoiceLabel: aiLetter,
            correctAnswerText: expl.correctAnswerText || aiLetter,
            extractionConfidence: expl.confidence,
            warnings:
              pdfLetter && pdfLetter !== aiLetter ? ["Corrected by ELA passage regen"] : [],
          },
        });
        keyId = entry.id;
      } else if (key && expl.correctAnswerText) {
        await prisma.pdfAnswerKeyEntry.update({
          where: { id: key.id },
          data: {
            correctAnswerText: expl.correctAnswerText,
            extractionConfidence: expl.confidence,
          },
        });
      }

      await prisma.pdfProblemSolution.upsert({
        where: { problemId: p.id },
        create: {
          problemId: p.id,
          answerKeyEntryId: keyId,
          correctChoiceLabel: mcq ? aiLetter : null,
          correctAnswerText: expl.correctAnswerText,
          explanationShort: expl.explanationShort,
          explanationStepByStep: expl.explanationStepByStep,
          childFriendlyExplanation: expl.childFriendlyExplanation,
          commonMistakes: expl.commonMistakes,
          prerequisiteSkills: expl.prerequisiteSkills,
          estimatedTimeSeconds: expl.estimatedTimeSeconds,
          generatedByModel: expl.modelUsed,
          generationStatus: "generated",
          confidence: expl.confidence,
        },
        update: {
          answerKeyEntryId: keyId,
          correctChoiceLabel: mcq ? aiLetter : null,
          correctAnswerText: expl.correctAnswerText,
          explanationShort: expl.explanationShort,
          explanationStepByStep: expl.explanationStepByStep,
          childFriendlyExplanation: expl.childFriendlyExplanation,
          commonMistakes: expl.commonMistakes,
          prerequisiteSkills: expl.prerequisiteSkills,
          generatedByModel: expl.modelUsed,
          generationStatus: "generated",
          confidence: expl.confidence,
        },
      });

      fixed++;
      logLine(
        `OK ${p.id} ${label} model=${expl.modelUsed} key=${aiLetter ?? expl.correctAnswerText?.slice(0, 20)}`,
      );
    } catch (e) {
      errors++;
      logLine(`ERR ${p.id} ${label} ${(e as Error).message}`);
    }

    processed++;
  }

  logLine(
    `Done: fixed=${fixed} keyChanges=${keyChanges} stillGeneric=${stillGeneric} errors=${errors} processed=${processed}`,
  );
}

main().finally(() => prisma.$disconnect());
