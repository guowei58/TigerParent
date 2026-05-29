import "dotenv/config";
import { prisma } from "../src/lib/db";
import { generateProblemExplanationWithAi } from "../src/lib/ai/generateProblemExplanation";
import { getGeminiVisionConfig, getOpenAiVisionConfig } from "../src/lib/ai/visionExplanation";
import { trustedAnswerKeyForAi } from "../src/lib/pdf/aiAnswerKey";
import { needsAiDerivedAnswerKey } from "../src/lib/pdf/answerKeyRules";
import { problemDisplayImagePath } from "../src/lib/pdf/ingestPdf";

const docId = process.argv[2];

async function main() {
  const where = docId ? { sourceDocumentId: docId } : {};
  const problems = await prisma.pdfPracticeProblem.findMany({
    where,
    orderBy: [{ sourceDocumentId: "asc" }, { problemNumber: "asc" }],
    include: { choices: { orderBy: { sortOrder: "asc" } } },
  });

  console.log(
    "regenerating explanations for",
    problems.length,
    "problems",
    `(pipeline: deepseek → ${getGeminiVisionConfig() ? "gemini" : "no-gemini"} → ${getOpenAiVisionConfig() ? "openai" : "no-openai"})`,
  );

  for (let i = 0; i < problems.length; i++) {
    const p = problems[i]!;
    const key = await prisma.pdfAnswerKeyEntry.findUnique({
      where: {
        sourceDocumentId_problemNumber: {
          sourceDocumentId: p.sourceDocumentId,
          problemNumber: p.problemNumber,
        },
      },
    });

    process.stdout.write(`[${i + 1}/${problems.length}] #${p.problemNumber} … `);

    if (i > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    const needsAi = needsAiDerivedAnswerKey(p.questionType, p.choices, key);
    const trusted = trustedAnswerKeyForAi(key, needsAi);
    const openResponse = p.questionType === "open_response" || needsAi;
    const expl = await generateProblemExplanationWithAi({
      cleanedText: p.rawText ?? p.cleanedText ?? "",
      choices: p.choices.map((c) => ({ label: c.label, text: c.text })),
      correctChoiceLabel: trusted.correctChoiceLabel,
      correctAnswerText: trusted.correctAnswerText,
      gradeLevel: p.gradeLevel ?? 5,
      subject: p.subject ?? "math",
      conceptName: p.subtopic ?? undefined,
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

    console.log(expl.modelUsed);
  }

  console.log("done");
}

main().finally(() => prisma.$disconnect());
