"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Problem } from "@/generated/prisma/client";
import { Scratchpad, strokesToJson, type Stroke } from "./Scratchpad";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { parseJsonArray } from "@/lib/utils";
import { LearnHelpPanel } from "./LearnHelpPanel";
import { ProblemPromptDisplay } from "./ProblemPromptDisplay";
import { analyzeWorkQuality, getWorkFeedback } from "@/lib/stroke-analysis";
import { displayChoicesForProblem } from "@/lib/mcq-choices";

type ProblemViewProps = {
  problem: Problem;
  onSubmit: (data: {
    answer: string;
    strokes: Stroke[];
    elapsedSeconds: number;
    drawingSeconds: number;
  }) => Promise<{
    isCorrect: boolean;
    explanation?: string | null;
    roast?: string | null;
    workFeedback?: string | null;
    blocked?: boolean;
    placementChange?: { direction: "up" | "down"; skillTitle: string } | null;
  }>;
  /** Called when the student taps Next after reading feedback */
  onContinue?: () => void;
  continueLabel?: string;
};

export function ProblemView({
  problem,
  onSubmit,
  onContinue,
  continueLabel = "Next Problem",
}: ProblemViewProps) {
  const [answer, setAnswer] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawingSeconds, setDrawingSeconds] = useState(0);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation?: string | null;
    roast?: string | null;
    workFeedback?: string | null;
    placementChange?: { direction: "up" | "down"; skillTitle: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const choices = useMemo(
    () => displayChoicesForProblem(problem),
    [problem],
  );
  const solved = feedback?.isCorrect === true;

  const workQuality = useMemo(
    () => analyzeWorkQuality(strokes, { drawingSeconds }),
    [strokes, drawingSeconds],
  );

  const needsScratchWork = problem.requiresScratchpad && !workQuality.showedWork;
  const canSubmit = Boolean(answer) && !needsScratchWork;
  const showScratchpad =
    problem.requiresScratchpad || problem.type !== "MULTIPLE_CHOICE";

  const handleScratchpadChange = (
    next: Stroke[],
    meta: { drawingSeconds: number },
  ) => {
    setStrokes(next);
    setDrawingSeconds(meta.drawingSeconds);
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setSubmitError(
        getWorkFeedback(workQuality, problem.requiresScratchpad) ??
          "Show your work on the scratchpad before submitting.",
      );
      return;
    }

    setLoading(true);
    setSubmitError(null);
    const elapsed = (Date.now() - startTime) / 1000;
    const result = await onSubmit({
      answer,
      strokes,
      elapsedSeconds: elapsed,
      drawingSeconds,
    });
    if (result.blocked) {
      setSubmitError(
        result.workFeedback ?? "Show your work on the scratchpad before submitting.",
      );
      setLoading(false);
      return;
    }
    setFeedback(result);
    setLoading(false);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <ProblemPromptDisplay
          prompt={problem.prompt}
          className="flex-1 text-xl"
        />
        <Badge variant="info">Grade {problem.gradeLevel}</Badge>
      </div>

      {showScratchpad && (
        <>
          <Scratchpad onChange={handleScratchpadChange} />
          {problem.requiresScratchpad && !solved && (
            <p
              className={`text-sm rounded-xl px-3 py-2 ${
                workQuality.showedWork
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {workQuality.showedWork
                ? "✓ Scratch work detected — you can submit when ready."
                : "✎ Show your steps on the scratchpad before submitting."}
            </p>
          )}
          {!problem.requiresScratchpad && !solved && workQuality.showedWork && (
            <p className="text-sm rounded-xl px-3 py-2 bg-indigo-50 text-indigo-800">
              ✓ Nice use of the scratchpad.
            </p>
          )}
        </>
      )}

      {problem.type === "MULTIPLE_CHOICE" && choices.length > 0 && (
        <div className="grid gap-3">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={solved}
              onClick={() => {
                setAnswer(choice.id);
                if (feedback && !feedback.isCorrect) setFeedback(null);
              }}
              className={`rounded-2xl border-2 p-4 text-left text-lg touch-manipulation transition ${
                answer === choice.id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-indigo-200"
              } ${solved ? "opacity-70 cursor-default" : ""}`}
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}

      {(problem.type === "NUMERIC" ||
        problem.type === "SHORT_ANSWER" ||
        problem.type === "WRITTEN_RESPONSE") && (
        <input
          type="text"
          value={answer}
          disabled={solved}
          onChange={(e) => {
            setAnswer(e.target.value);
            if (feedback && !feedback.isCorrect) setFeedback(null);
          }}
          placeholder="Type your answer..."
          className="w-full rounded-2xl border-2 border-slate-200 px-4 py-4 text-lg focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
        />
      )}

      {feedback && (
        <div
          className={`rounded-2xl p-4 space-y-2 ${
            feedback.isCorrect
              ? "bg-emerald-50 text-emerald-900 border-2 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-2 border-rose-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            🐯 Tiger Parent says
          </p>
          <p className="font-bold text-lg leading-snug">
            {feedback.roast ??
              (feedback.isCorrect ? "Correct! Nice work." : "Not quite — try again.")}
          </p>
          {feedback.workFeedback && (
            <p className="text-sm opacity-90 border-t border-current/10 pt-2">
              {feedback.workFeedback}
            </p>
          )}
          {feedback.placementChange && (
            <p className="text-sm font-medium border-t border-current/10 pt-2">
              {feedback.placementChange.direction === "down"
                ? `We moved you to ${feedback.placementChange.skillTitle} to build a stronger foundation.`
                : `You're ready for ${feedback.placementChange.skillTitle}!`}
            </p>
          )}
          {feedback.isCorrect && feedback.explanation && (
            <p className="text-sm opacity-80 border-t border-current/10 pt-2">
              <span className="font-medium">Why: </span>
              {feedback.explanation}
            </p>
          )}
          {!feedback.isCorrect && (
            <p className="text-sm opacity-90 border-t border-current/10 pt-2">
              Change your answer and submit again. The solution stays hidden until you
              get it right.
            </p>
          )}
        </div>
      )}

      {solved && (
        <LearnHelpPanel skillId={problem.skillId} show={true} />
      )}

      {!solved && (
        <>
          <Link
            href={`/student/lesson/${problem.skillId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Stuck? Learn how to solve this →
          </Link>
          {submitError && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
              {submitError}
            </p>
          )}
          <Button
            size="lg"
            className="w-full"
            disabled={!canSubmit || loading}
            onClick={handleSubmit}
          >
            {loading
              ? "Checking..."
              : needsScratchWork && answer
                ? "Show work on scratchpad first"
                : "Submit Answer"}
          </Button>
        </>
      )}

      {solved && onContinue && (
        <Button size="lg" className="w-full" onClick={onContinue}>
          {continueLabel}
        </Button>
      )}
    </Card>
  );
}

export { strokesToJson };
