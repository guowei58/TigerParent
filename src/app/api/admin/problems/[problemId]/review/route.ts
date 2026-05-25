import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runAndPersistProblemValidation } from "@/lib/content-validation/pipeline";
import { approveImportedProblem } from "@/lib/content-provenance/import-pipeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ problemId: string }> },
) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { problemId } = await params;
  const body = await request.json();
  const action = body.action as string;

  if (action === "approve") {
    try {
      const problem = await approveImportedProblem(
        problemId,
        body.notes ?? "Manually approved",
      );
      await prisma.problemQualityReview.create({
        data: {
          problemId,
          reviewerType: "HUMAN",
          reviewerName: session.user.name ?? "Admin",
          status: problem.reviewStatus === "APPROVED" ? "APPROVED" : "NEEDS_REVIEW",
          answerCorrectnessCheck: "PASS",
          explanationQualityCheck: "PASS",
          notes: body.notes ?? "Manually approved with provenance checks",
        },
      });
      return NextResponse.json({ ok: true, problem });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approval failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === "reject" || action === "retire") {
    await prisma.problem.update({
      where: { id: problemId },
      data: {
        reviewStatus: action === "retire" ? "RETIRED" : "REJECTED",
        approved: false,
        studentReady: false,
        canShowToStudent: false,
        isActive: action !== "retire",
        provenanceStatus: action === "reject" ? "REJECTED" : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "revalidate") {
    const pipeline = await runAndPersistProblemValidation(problemId);
    return NextResponse.json({ ok: true, pipeline });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
