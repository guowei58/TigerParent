import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildPdfPracticeProgress,
  getPdfProblemProgressMap,
  progressScopeFromSession,
} from "@/lib/pdf-practice/progress";
import { selectApprovedPdfProblems } from "@/lib/pdf-practice/selection";
import { assetUrl, problemDisplayImagePath } from "@/lib/pdf/displayPaths";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user.role !== "STUDENT" && session?.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const conceptSlug = url.searchParams.get("conceptSlug") ?? undefined;
    const gradeParam = url.searchParams.get("gradeLevel");
    const gradeLevel = gradeParam ? parseInt(gradeParam, 10) : undefined;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : 500;

    const problems = await selectApprovedPdfProblems({
      conceptSlug,
      gradeLevel: Number.isFinite(gradeLevel) ? gradeLevel : undefined,
      limit,
    });
    const problemIds = problems.map((p) => p.id);

    const scope = progressScopeFromSession(session.user);
    const progressMap = scope
      ? await getPdfProblemProgressMap(scope, problemIds)
      : new Map();
    const progress = buildPdfPracticeProgress(problemIds, progressMap);

    return NextResponse.json({
      problems: problems.map((p) => ({
        id: p.id,
        problemNumber: p.problemNumber,
        questionType: p.questionType,
        studentDisplayMode: p.studentDisplayMode,
        problemImageUrl: assetUrl(problemDisplayImagePath(p)),
        fullPageImageUrl: assetUrl(p.fullPageImagePath),
        choices: p.choices,
        concept: p.primaryConcept,
      progressStatus: progress.byProblemId[p.id] ?? null,
    })),
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
