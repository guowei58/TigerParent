import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { extractPdfText } from "../lib/pdf-text";
import { bulkImportProblems, loadSkillContext, resolveEnglishSkillId, resolveMathSkillId } from "../lib/import-helpers";

type SatMcq = {
  num: number;
  section: "reading" | "math";
  prompt: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

function parseSatMcqs(testText: string, answerText: string): SatMcq[] {
  const items: SatMcq[] = [];
  const answerMap = new Map<number, { answer: string; explanation: string }>();

  const ansBlocks = answerText.split(/Question\s+(\d+)/i);
  for (let i = 1; i < ansBlocks.length; i += 2) {
    const num = parseInt(ansBlocks[i], 10);
    const body = ansBlocks[i + 1] ?? "";
    const correct = body.match(/Correct Answer:\s*([A-D])/i)?.[1] ?? "";
    const explanation = body.match(/Rationale[:\s]+([\s\S]{0,600}?)(?:Question|\n\n|$)/i)?.[1]?.trim() ?? "";
    if (correct) answerMap.set(num, { answer: correct, explanation });
  }

  let section: "reading" | "math" = "reading";
  const lines = testText.split("\n");
  let currentNum = 0;
  let buffer: string[] = [];

  for (const line of lines) {
    if (/Math\s+\d+\s+QUESTIONS/i.test(line)) section = "math";
    const qMatch = line.match(/^(\d+)\s*$/);
    if (qMatch) {
      if (currentNum > 0 && buffer.length) {
        pushSatItem(items, currentNum, section, buffer.join("\n"), answerMap);
      }
      currentNum = parseInt(qMatch[1], 10);
      buffer = [];
      continue;
    }
    if (currentNum > 0) buffer.push(line);
  }
  if (currentNum > 0 && buffer.length) {
    pushSatItem(items, currentNum, section, buffer.join("\n"), answerMap);
  }

  return items.filter((i) => i.choices.length >= 2 && i.correctAnswer);
}

function pushSatItem(
  items: SatMcq[],
  num: number,
  section: "reading" | "math",
  body: string,
  answerMap: Map<number, { answer: string; explanation: string }>,
) {
  const choiceRe = /(?:^|\n)\s*([A-D])\s+(.+?)(?=(?:\n\s*[A-D]\s)|$)/gs;
  const choices: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = choiceRe.exec(body)) !== null) {
    choices.push(m[2].trim().slice(0, 300));
  }
  const promptEnd = body.search(/\n\s*A\s/);
  const prompt = (promptEnd > 0 ? body.slice(0, promptEnd) : body).trim().slice(0, 1200);
  const ans = answerMap.get(num);
  if (prompt.length < 20) return;

  items.push({
    num,
    section,
    prompt,
    choices,
    correctAnswer: ans?.answer ?? "",
    explanation: ans?.explanation || `College Board SAT Practice Test 10, Question ${num}.`,
  });
}

export async function importSatPracticeTest10(options?: { autoApprove?: boolean }) {
  const ctx = await loadSkillContext();
  const testPath = "data/imports/sat-practice-test-10.pdf";
  const ansPath = "data/imports/sat-practice-test-10-answers.pdf";

  console.log("College Board SAT Practice Test 10: parsing...");
  const [testText, answerText] = await Promise.all([
    extractPdfText(testPath),
    extractPdfText(ansPath),
  ]);

  const mcqs = parseSatMcqs(testText, answerText);
  const items: ImportItemInput[] = mcqs.map((q) => {
    const isMath = q.section === "math";
    const grade = isMath ? 11 : 10;
    return {
      sourceQuestionId: `cb-sat-pt10-${q.section}-q${q.num}`,
      sourceYear: 2024,
      sourceExam: "SAT Practice Test 10",
      sourceGradeLevel: grade,
      subjectSlug: isMath ? "math" : "english",
      subjectId: isMath ? ctx.mathSubjectId : ctx.englishSubjectId,
      skillId: isMath
        ? resolveMathSkillId(ctx, 10, "Multi-Step Word Problems")
        : resolveEnglishSkillId(ctx, 10, "Inference"),
      gradeLevel: grade,
      type: "MULTIPLE_CHOICE",
      prompt: q.prompt,
      choices: q.choices.slice(0, 4),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: 7,
      usageType: "SAT_PRACTICE",
      satDomain: isMath ? "Problem-Solving and Data Analysis" : "Information and Ideas",
      attributionText: "© College Board — official SAT practice test",
    } as ImportItemInput & { satDomain?: string };
  });

  console.log(`  extracted ${items.length} SAT MCQs`);
  if (items.length === 0) {
    return { imported: 0, skipped: 0, batchId: null };
  }

  return bulkImportProblems("college-board-sat-pdf", items, {
    autoApprove: options?.autoApprove ?? true,
    usageType: "SAT_PRACTICE",
    batchNotes: "College Board SAT Practice Test 10 (official PDF)",
  });
}
