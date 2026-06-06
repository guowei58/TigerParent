import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildPdfPracticeProgress,
  getPdfProblemProgressMap,
  progressScopeFromSession,
} from "@/lib/pdf-practice/progress";
import { selectApprovedPdfProblems } from "@/lib/pdf-practice/selection";
import { assetUrl, elaQuestionDisplayImagePath, problemDisplayImagePath } from "@/lib/pdf/displayPaths";
import { passageViewFromDb } from "@/lib/pdf/passageView";
import {
  openResponseReveal,
  shouldShowOpenResponseExplanation,
} from "@/lib/pdf/problemExplanation";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user.role !== "STUDENT" && session?.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const conceptSlug = url.searchParams.get("conceptSlug") ?? undefined;
    const passageId = url.searchParams.get("passageId") ?? undefined;
    const gradeParam = url.searchParams.get("gradeLevel");
    const gradeLevel = gradeParam ? parseInt(gradeParam, 10) : undefined;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : 500;

    if (!conceptSlug && !passageId) {
      return NextResponse.json({ error: "conceptSlug or passageId required" }, { status: 400 });
    }

    const problems = await selectApprovedPdfProblems({
      conceptSlug,
      passageId,
      gradeLevel: Number.isFinite(gradeLevel) ? gradeLevel : undefined,
      limit,
    });
    const problemIds = problems.map((p) => p.id);

    const scope = progressScopeFromSession(session.user);
    const progressMap = scope
      ? await getPdfProblemProgressMap(scope, problemIds)
      : new Map();
    const progress = buildPdfPracticeProgress(problemIds, progressMap);

    const sourceDocIds = [...new Set(problems.map((p) => p.sourceDocumentId))];
    const answerKeys =
      sourceDocIds.length > 0
        ? await prisma.pdfAnswerKeyEntry.findMany({
            where: { sourceDocumentId: { in: sourceDocIds } },
          })
        : [];
    const keyByProblem = new Map(
      answerKeys.map((k) => [`${k.sourceDocumentId}:${k.problemNumber}`, k]),
    );

    return NextResponse.json({
      problems: problems.map((p) => {
        const progressStatus = progress.byProblemId[p.id] ?? null;
        const reveal = shouldShowOpenResponseExplanation(p.questionType, progressStatus)
          ? openResponseReveal(
              p.solution,
              keyByProblem.get(`${p.sourceDocumentId}:${p.problemNumber}`),
            )
          : { sampleAnswer: null, explanation: null };
        return {
          id: p.id,
          problemNumber: p.problemNumber,
          questionType: p.questionType,
          subject: p.subject,
          cleanedText: p.cleanedText,
          studentDisplayMode: p.studentDisplayMode,
          problemImageUrl: assetUrl(
            p.passageId ? elaQuestionDisplayImagePath(p) : problemDisplayImagePath(p),
            p.updatedAt.getTime(),
          ),
          fullPageImageUrl: assetUrl(p.fullPageImagePath, p.updatedAt.getTime()),
          choices: p.choices,
          concept: p.primaryConcept,
          passageId: p.passageId,
          passage: p.passage ? passageViewFromDb(p.passage) : null,
          progressStatus,
          sampleAnswer: reveal.sampleAnswer,
          explanation: reveal.explanation,
        };
      }),
    progress: {
      byProblemId: progress.byProblemId,
      correctCount: progress.correctCount,
      incorrectCount: progress.incorrectCount,
      skippedCount: progress.skippedCount,
      resumeIndex: progress.resumeIndex,
    },
  });
  } catch (error) {
    console.error("[pdf-problems] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load practice problems" },
      { status: 500 },
    );
  }
}
