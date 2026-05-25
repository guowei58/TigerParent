import { Card, CardTitle } from "@/components/ui/Card";
import { StrokeViewer } from "@/components/StrokeViewer";
import { ProblemPromptDisplay } from "@/components/ProblemPromptDisplay";
import {
  WorkQualityBadge,
  resolveAttemptWorkQuality,
} from "@/components/WorkQualityBadge";
import type { AssignmentRationale } from "@/lib/assignment-rationale";

type AttemptReviewDetailProps = {
  attempt: {
    answer: string;
    isCorrect: boolean;
    elapsedSeconds: number;
    problem: {
      prompt: string;
      correctAnswer: string;
      explanation: string | null;
      requiresScratchpad: boolean;
      skill: { title: string };
    };
    strokes?: { strokeDataJson: unknown } | null;
    showedWork: boolean | null;
    workQualityJson: unknown;
  };
  rationale?: AssignmentRationale | null;
};

export function AttemptReviewDetail({
  attempt,
  rationale,
}: AttemptReviewDetailProps) {
  const workQuality = resolveAttemptWorkQuality(attempt);

  return (
    <>
      {rationale && (
        <Card className="border-indigo-100 bg-indigo-50/40">
          <CardTitle>{rationale.headline}</CardTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {rationale.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-white px-2 py-0.5">
              {rationale.subjectName} · grade {rationale.gradeLevel}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5">
              Difficulty {rationale.difficulty}/10
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 capitalize">
              {rationale.assignmentType}
            </span>
            {rationale.standardCodes.length > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5">
                Standards: {rationale.standardCodes.join(", ")}
              </span>
            )}
            {rationale.contentClass && (
              <span className="rounded-full bg-white px-2 py-0.5">
                Source: {rationale.contentClass.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
            {rationale.confidenceLevel && (
              <span className="rounded-full bg-white px-2 py-0.5">
                {rationale.confidenceLevel}
              </span>
            )}
          </div>
          {rationale.contentMix && rationale.contentMix.count > 0 && (
            <p className="mt-3 text-xs text-slate-600">
              Practice set mix: {rationale.contentMix.officialPercent}% official ·{" "}
              {rationale.contentMix.licensedPercent}% licensed/OER ·{" "}
              {rationale.contentMix.generatedPercent}% generated · avg confidence{" "}
              {rationale.contentMix.averageConfidence}
            </p>
          )}
          {rationale.lowConfidenceWarning && (
            <p className="mt-2 text-xs text-amber-800 bg-amber-50 rounded-lg p-2">
              {rationale.lowConfidenceWarning}
            </p>
          )}
        </Card>
      )}
      <Card>
        <CardTitle>{attempt.problem.skill.title}</CardTitle>
        <div className="mt-2">
          <ProblemPromptDisplay prompt={attempt.problem.prompt} compact />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Student Answer</p>
            <p className="font-medium">{attempt.answer}</p>
          </div>
          <div>
            <p className="text-slate-500">Correct Answer</p>
            <p className="font-medium">{attempt.problem.correctAnswer}</p>
          </div>
          <div>
            <p className="text-slate-500">Result</p>
            <p
              className={
                attempt.isCorrect
                  ? "text-emerald-600 font-medium"
                  : "text-rose-600 font-medium"
              }
            >
              {attempt.isCorrect ? "Correct" : "Incorrect"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Time</p>
            <p>{attempt.elapsedSeconds.toFixed(1)}s</p>
          </div>
          <div>
            <p className="text-slate-500">Scratch Work</p>
            <WorkQualityBadge
              quality={workQuality}
              requiresScratchpad={attempt.problem.requiresScratchpad}
            />
          </div>
        </div>
        {attempt.problem.requiresScratchpad && !workQuality.showedWork && (
          <p className="mt-4 text-sm bg-amber-50 text-amber-900 rounded-xl p-3">
            This problem required scratch work, but little or no work was
            captured.
          </p>
        )}
        {workQuality.showedWork && (
          <p className="mt-4 text-sm text-slate-500">
            {workQuality.strokeCount} strokes · {workQuality.totalPathLength}px
            drawn
            {workQuality.drawingSeconds > 0
              ? ` · ${workQuality.drawingSeconds}s on scratchpad`
              : ""}
          </p>
        )}
        {attempt.problem.explanation && (
          <p className="mt-4 text-sm bg-emerald-50 text-emerald-800 rounded-xl p-3">
            {attempt.problem.explanation}
          </p>
        )}
      </Card>

      {(attempt.strokes || workQuality.showedWork) && (
        <Card>
          <CardTitle>Stylus Scratch Work</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Every stroke captured from the scratchpad.
          </p>
          {attempt.strokes ? (
            <StrokeViewer strokeData={attempt.strokes.strokeDataJson} />
          ) : (
            <p className="text-slate-500 mt-2">No stroke data saved.</p>
          )}
        </Card>
      )}
    </>
  );
}
