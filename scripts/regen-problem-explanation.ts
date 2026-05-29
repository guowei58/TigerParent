import "dotenv/config";
import { prisma } from "../src/lib/db";
import { generateProblemExplanationWithAi } from "../src/lib/ai/generateProblemExplanation";
import { trustedAnswerKeyForAi } from "../src/lib/pdf/aiAnswerKey";
import { needsAiDerivedAnswerKey } from "../src/lib/pdf/answerKeyRules";
import { problemDisplayImagePath } from "../src/lib/pdf/ingestPdf";

const problemId = process.argv[2];

async function main() {
  if (!problemId) {
    console.error("Usage: regen-problem-explanation.ts <problemId>");
    process.exit(1);
  }

  const p = await prisma.pdfPracticeProblem.findUniqueOrThrow({
    where: { id: problemId },
    include: { choices: { orderBy: { sortOrder: "asc" } } },
  });

  const key = await prisma.pdfAnswerKeyEntry.findUnique({
    where: {
      sourceDocumentId_problemNumber: {
        sourceDocumentId: p.sourceDocumentId,
        problemNumber: p.problemNumber,
      },
    },
  });

  console.log("Problem", p.problemNumber, "doc", p.sourceDocumentId);
  console.log("raw:", p.rawText?.slice(0, 120));
  console.log("key:", key?.correctChoiceLabel, key?.correctAnswerText);
  console.log("image:", problemDisplayImagePath(p));

  const needsAi = needsAiDerivedAnswerKey(p.questionType, p.choices, key);
  const openResponse = p.questionType === "open_response" || needsAi;
  const trusted = trustedAnswerKeyForAi(key, needsAi);
  const expl = await generateProblemExplanationWithAi({
    cleanedText: p.rawText ?? p.cleanedText ?? "",
    choices: p.choices.map((c) => ({ label: c.label, text: c.text })),
    correctChoiceLabel: trusted.correctChoiceLabel,
    correctAnswerText: trusted.correctAnswerText,
    gradeLevel: p.gradeLevel ?? 4,
    subject: p.subject ?? "math",
    problemImagePath: problemDisplayImagePath(p),
  });

  await prisma.pdfProblemSolution.upsert({
    where: { problemId: p.id },
    create: {
      problemId: p.id,
      answerKeyEntryId: key?.id,
      correctChoiceLabel: openResponse
        ? trusted.correctChoiceLabel
        : (trusted.correctChoiceLabel ?? expl.correctChoiceLabel),
      correctAnswerText: trusted.correctAnswerText ?? expl.correctAnswerText,
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
      answerKeyEntryId: key?.id,
      correctChoiceLabel: openResponse
        ? trusted.correctChoiceLabel
        : (trusted.correctChoiceLabel ?? expl.correctChoiceLabel),
      correctAnswerText: trusted.correctAnswerText ?? expl.correctAnswerText,
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

  console.log("\nmodel:", expl.modelUsed);
  console.log("\nshort:", expl.explanationShort);
  console.log("\nsteps:\n", expl.explanationStepByStep);
}

main().finally(() => prisma.$disconnect());
