/**
 * Re-run vision explanation pipeline for all problems with generic/key-only explanations.
 * Solves from the problem image (no PDF key anchor) so wrong MCQ keys can be corrected.
 *
 * Usage:
 *   npx tsx --import dotenv/config scripts/regenerate-generic-explanations.ts
 *   npx tsx --import dotenv/config scripts/regenerate-generic-explanations.ts --limit 10
 *   npx tsx --import dotenv/config scripts/regenerate-generic-explanations.ts --resume
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
const LOG_PATH = path.join(process.cwd(), "data", "imports", "regen-generic-explanations.log");
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
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1]!, 10);
    if (args[i] === "--resume") resume = true;
  }
  return { limit, resume };
}

function logLine(line: string) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, line + "\n");
  console.log(line);
}

async function main() {
  const { limit, resume } = parseArgs();
  const doneIds = new Set<string>();

  if (resume && fs.existsSync(LOG_PATH)) {
    for (const line of fs.readFileSync(LOG_PATH, "utf8").split("\n")) {
      const m = line.match(/^OK\s+(\S+)/);
      if (m) doneIds.add(m[1]!);
    }
    logLine(`Resuming — ${doneIds.size} already completed`);
  }

  logLine(
    `Pipeline: gemini=${getGeminiVisionConfig()?.model ?? "none"} openai=${getOpenAiVisionConfig()?.model ?? "none"}`,
  );

  const problems = await prisma.pdfPracticeProblem.findMany({
    orderBy: [{ sourceDocumentId: "asc" }, { problemNumber: "asc" }],
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
      solution: true,
      sourceDocument: { select: { title: true } },
    },
  });

  const targets = problems.filter(
    (p) => p.solution && isGenericSolution(p.solution) && !doneIds.has(p.id),
  );

  logLine(`Found ${targets.length} generic problems (${problems.length} total)`);

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

    if (processed > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    const label = `[${processed + 1}/${Math.min(limit, targets.length)}] ${p.sourceDocument.title} #${p.problemNumber}`;

    try {
      let expl =
        img != null
          ? await generateExplanationFromProblemImage(
              {
                cleanedText: p.rawText ?? p.cleanedText ?? "",
                choices: choiceRows,
                correctChoiceLabel: null,
                correctAnswerText: null,
                gradeLevel: p.gradeLevel ?? 5,
                subject: p.subject ?? "math",
                conceptName: p.subtopic ?? undefined,
                problemImagePath: img,
              },
              img,
              null,
            )
          : null;

      if (!expl) {
        expl = await generateProblemExplanationWithAi({
          cleanedText: p.rawText ?? p.cleanedText ?? "",
          choices: choiceRows,
          correctChoiceLabel: null,
          correctAnswerText: null,
          gradeLevel: p.gradeLevel ?? 5,
          subject: p.subject ?? "math",
          conceptName: p.subtopic ?? undefined,
          problemImagePath: img,
        });
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
        textLooksLikeMcq(p.rawText ?? p.cleanedText ?? "");

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
            warnings: pdfLetter && pdfLetter !== aiLetter ? ["Corrected by vision regen"] : [],
          },
          update: {
            rawAnswerText: aiLetter,
            correctChoiceLabel: aiLetter,
            correctAnswerText: expl.correctAnswerText || aiLetter,
            extractionConfidence: expl.confidence,
            warnings: pdfLetter && pdfLetter !== aiLetter ? ["Corrected by vision regen"] : [],
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

      const newQuestionType =
        mcq && aiLetter
          ? p.requiresImage
            ? "visual_multiple_choice"
            : "multiple_choice"
          : p.questionType;

      if (newQuestionType !== p.questionType) {
        await prisma.pdfPracticeProblem.update({
          where: { id: p.id },
          data: { questionType: newQuestionType as never },
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
      logLine(`OK ${p.id} ${label} model=${expl.modelUsed} key=${aiLetter ?? expl.correctAnswerText?.slice(0, 20)}`);
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
