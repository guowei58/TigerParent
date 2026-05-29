"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isMcqQuestion,
  mcqChoiceLabels,
  ProblemAnswerInput,
} from "@/components/pdf/ProblemAnswerInput";
import type { RoastUsage } from "@/lib/tiger-parent-roasts";
import {
  countProgressStatuses,
  findFirstIncompleteIndex,
  type PdfProblemProgressStatus,
} from "@/lib/pdf-practice/progress-shared";
import { Scratchpad, type Stroke } from "@/components/Scratchpad";
import { Button } from "@/components/ui/Button";
import { FormattedExplanation } from "@/components/pdf/FormattedExplanation";
import { analyzeWorkQuality, getWorkFeedback } from "@/lib/stroke-analysis";
import { PDF_PRACTICE_REQUIRES_SCRATCHPAD } from "@/lib/pdf-practice/attempt-strokes";
import { cn } from "@/lib/utils";
import { PracticeSectionSummary } from "./PracticeSectionSummary";
import { PracticeSectionReview } from "./PracticeSectionReview";

type Problem = {
  id: string;
  questionType: string;
  problemImageUrl: string | null;
  fullPageImageUrl: string | null;
  choices: { label: string; text: string | null }[];
  progressStatus: PdfProblemProgressStatus | null;
};

export function PdfPracticeClient({
  conceptSlug,
  conceptName,
  conceptDomain,
  gradeLevel,
}: {
  conceptSlug: string;
  conceptName: string;
  conceptDomain: string;
  gradeLevel?: number;
}) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, PdfProblemProgressStatus>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [freeResponse, setFreeResponse] = useState("");
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string | null;
    roast: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [answerReady, setAnswerReady] = useState(false);
  const [roastUsage, setRoastUsage] = useState<RoastUsage>({ correct: [], wrong: [] });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawingSeconds, setDrawingSeconds] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [postCompleteView, setPostCompleteView] = useState<"summary" | "review">(
    "summary",
  );
  const imgRef = useRef<HTMLImageElement>(null);
  const problemStartedAtRef = useRef<number>(Date.now());

  function secondsOnCurrentProblem() {
    return Math.max(1, Math.round((Date.now() - problemStartedAtRef.current) / 1000));
  }

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    const gradeQuery =
      gradeLevel != null ? `&gradeLevel=${encodeURIComponent(String(gradeLevel))}` : "";
    fetch(
      `/api/practice/pdf-problems?conceptSlug=${encodeURIComponent(conceptSlug)}${gradeQuery}`,
    )
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) {
          let message = "Could not load practice problems.";
          try {
            const err = JSON.parse(text) as { error?: string };
            if (err.error) message = err.error;
          } catch {
            /* non-JSON error body */
          }
          throw new Error(message);
        }
        if (!text.trim()) {
          throw new Error("Empty response from server. Try refreshing.");
        }
        return JSON.parse(text) as {
          problems?: Problem[];
          progress?: {
            byProblemId?: Record<string, PdfProblemProgressStatus>;
            correctCount?: number;
            incorrectCount?: number;
            skippedCount?: number;
            resumeIndex?: number;
          };
        };
      })
      .then((d) => {
        const loaded: Problem[] = d.problems ?? [];
        const byProblemId = d.progress?.byProblemId ?? {};
        setProblems(loaded);
        setProgress(byProblemId);
        const resume = findFirstIncompleteIndex(loaded, byProblemId);
        setIndex(resume >= 0 ? resume : Math.max(0, loaded.length - 1));
        setLoading(false);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Could not load practice problems.");
        setLoading(false);
      });
  }, [conceptSlug, gradeLevel]);

  const current = problems[index];
  const img = current?.problemImageUrl ?? current?.fullPageImageUrl;
  const mcq = current ? isMcqQuestion(current.questionType, current.choices) : true;
  const solved = feedback?.isCorrect === true;
  const currentStatus = current ? progress[current.id] : undefined;
  const alreadyDone =
    currentStatus === "correct" ||
    currentStatus === "incorrect" ||
    currentStatus === "skipped";
  /** Re-opening a finished problem — not the moment right after submitting. */
  const reviewingCompletedProblem = alreadyDone && !feedback;
  const showProblemAndScratch = !reviewingCompletedProblem;

  useEffect(() => {
    problemStartedAtRef.current = Date.now();
    setStrokes([]);
    setDrawingSeconds(0);
    setSubmitError(null);
  }, [index, current?.id]);

  const workQuality = useMemo(
    () => analyzeWorkQuality(strokes, { drawingSeconds }),
    [strokes, drawingSeconds],
  );
  const needsScratchWork =
    PDF_PRACTICE_REQUIRES_SCRATCHPAD && !workQuality.showedWork;
  const hasAnswer = mcq ? Boolean(selected) : Boolean(freeResponse.trim());
  const canSubmit = hasAnswer && !needsScratchWork;

  function handleScratchpadChange(
    next: Stroke[],
    meta: { drawingSeconds: number },
  ) {
    setStrokes(next);
    setDrawingSeconds(meta.drawingSeconds);
    if (submitError) setSubmitError(null);
  }

  useEffect(() => {
    if (!img) {
      setAnswerReady(true);
      return;
    }
    setAnswerReady(false);
    const frame = requestAnimationFrame(() => {
      const el = imgRef.current;
      if (el?.complete && el.naturalHeight > 0) {
        setAnswerReady(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [img, index]);

  const stats = useMemo(() => countProgressStatuses(progress), [progress]);
  const doneCount = stats.done;
  const correctCount = stats.correct;
  const incorrectCount = stats.incorrect;
  const skippedCount = stats.skipped;
  const remainingCount = Math.max(0, problems.length - doneCount);
  const allComplete = problems.length > 0 && remainingCount === 0;

  const choiceCount = current ? mcqChoiceLabels(current.choices).length : 4;
  const submitDelayMs = 120 + choiceCount * 70 + 80;

  function markProgress(problemId: string, status: PdfProblemProgressStatus) {
    setProgress((prev) => ({ ...prev, [problemId]: status }));
    setProblems((prev) =>
      prev.map((p) => (p.id === problemId ? { ...p, progressStatus: status } : p)),
    );
  }

  function clearWrongFeedback() {
    if (feedback && !feedback.isCorrect) setFeedback(null);
  }

  async function submit() {
    if (!current || alreadyDone) return;
    if (!hasAnswer) return;
    if (!canSubmit) {
      setSubmitError(
        getWorkFeedback(workQuality, PDF_PRACTICE_REQUIRES_SCRATCHPAD) ??
          "Show your work on the scratchpad before submitting.",
      );
      return;
    }

    setChecking(true);
    setSubmitError(null);
    const res = await fetch("/api/practice/submit-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: current.id,
        selectedChoiceLabel: mcq ? selected : undefined,
        freeResponseText: mcq ? undefined : freeResponse.trim(),
        timeSpentSeconds: secondsOnCurrentProblem(),
        strokes,
        drawingSeconds,
        roastUsage,
      }),
    });
    const data = await res.json();
    setChecking(false);
    if (data.blocked) {
      setSubmitError(
        data.workFeedback ??
          data.error ??
          "Show your work on the scratchpad before submitting.",
      );
      return;
    }
    if (data.roastUsage) {
      setRoastUsage(data.roastUsage);
    }
    if (data.isCorrect) {
      const status =
        data.progressStatus === "incorrect" || data.progressStatus === "correct"
          ? data.progressStatus
          : "correct";
      markProgress(current.id, status);
    }
    setFeedback({
      isCorrect: Boolean(data.isCorrect),
      explanation: data.isCorrect ? (data.explanation ?? null) : null,
      roast: data.roast ?? null,
    });
  }

  function goToNextProblem() {
    setSelected(null);
    setFreeResponse("");
    setFeedback(null);
    setStrokes([]);
    setDrawingSeconds(0);
    setSubmitError(null);
    const next = findFirstIncompleteIndex(problems, progress, index);
    if (next >= 0) setIndex(next);
  }

  async function skip() {
    if (!current || alreadyDone) return;
    if (needsScratchWork) {
      setSubmitError(
        getWorkFeedback(workQuality, PDF_PRACTICE_REQUIRES_SCRATCHPAD) ??
          "Show your work on the scratchpad before skipping.",
      );
      return;
    }
    setChecking(true);
    setSubmitError(null);
    const res = await fetch("/api/practice/skip-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId: current.id,
        timeSpentSeconds: secondsOnCurrentProblem(),
        strokes,
        drawingSeconds,
      }),
    });
    const data = await res.json();
    setChecking(false);
    if (data.blocked) {
      setSubmitError(
        data.workFeedback ??
          data.error ??
          "Show your work on the scratchpad before skipping.",
      );
      return;
    }
    markProgress(current.id, "skipped");
    goToNextProblem();
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (loadError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p className="font-medium">{loadError}</p>
        <p className="mt-2 text-rose-800/90">
          If you just updated the app, restart the dev server and refresh this page.
        </p>
      </div>
    );
  }
  if (!current) return <p className="text-slate-500">No approved problems in this section.</p>;

  if (allComplete) {
    if (postCompleteView === "review") {
      return (
        <PracticeSectionReview
          conceptSlug={conceptSlug}
          conceptName={conceptName}
          gradeLevel={gradeLevel}
          onBackToSummary={() => setPostCompleteView("summary")}
        />
      );
    }
    return (
      <PracticeSectionSummary
        conceptName={conceptName}
        domain={conceptDomain}
        total={problems.length}
        correct={correctCount}
        incorrect={incorrectCount}
        skipped={skippedCount}
        onReviewWork={() => setPostCompleteView("review")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">
            {doneCount} done · {remainingCount} left
          </p>
          <p className="text-xs text-slate-500">
            {correctCount} correct · {incorrectCount} wrong · {skippedCount} skipped
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${problems.length ? (doneCount / problems.length) * 100 : 0}%` }}
          />
        </div>
        {problems.length <= 60 && (
          <div className="flex flex-wrap gap-1" aria-hidden>
            {problems.map((p, i) => (
              <div
                key={p.id}
                title={
                  progress[p.id] === "correct"
                    ? "Correct"
                    : progress[p.id] === "incorrect"
                      ? "Wrong, then correct"
                      : progress[p.id] === "skipped"
                        ? "Skipped"
                        : i === index
                          ? "Current"
                          : "Not started"
                }
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  i === index && "ring-2 ring-indigo-500 ring-offset-1",
                  progress[p.id] === "correct" && "bg-emerald-500",
                  progress[p.id] === "incorrect" && "bg-rose-500",
                  progress[p.id] === "skipped" && "bg-amber-400",
                  !progress[p.id] && "bg-slate-300",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {reviewingCompletedProblem ? (
        <div className="w-fit max-w-full">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img}
              ref={imgRef}
              src={img}
              alt="Practice question"
              className="block h-auto w-auto max-w-full max-h-[min(62vh,560px)] object-contain rounded-xl border border-slate-200 bg-white shadow-sm"
              onLoad={() => setAnswerReady(true)}
            />
          ) : (
            <p className="text-slate-500 text-sm">No problem image.</p>
          )}
        </div>
      ) : showProblemAndScratch ? (
        <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:items-start">
          <div
            className={cn(
              "order-1 md:col-start-1 md:row-start-2",
              "mx-auto md:mx-0",
              "h-[min(62vh,560px)] w-fit max-w-full overflow-hidden",
            )}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img}
                ref={imgRef}
                src={img}
                alt="Practice question"
                className="block h-full w-auto max-w-full rounded-xl border border-slate-200 bg-white shadow-sm object-contain object-top"
                onLoad={() => setAnswerReady(true)}
              />
            ) : (
              <p className="text-slate-500 text-sm">No problem image.</p>
            )}
          </div>

          <p className="order-2 text-sm font-semibold text-slate-800 md:col-start-2 md:row-start-1 md:order-none">
            Scratch work
          </p>

          <div
            className={cn(
              "order-3 md:col-start-2 md:row-start-2 md:order-none",
              "h-[min(62vh,560px)] w-full min-w-0",
            )}
          >
            <Scratchpad
              key={current.id}
              compact
              controlsInside
              className={cn("h-full min-h-0", solved && "pointer-events-none")}
              onChange={handleScratchpadChange}
            />
          </div>

          <p
            className={cn(
              "order-4 text-xs rounded-lg px-2 py-1.5 leading-snug md:col-start-2 md:order-none",
              workQuality.showedWork
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800",
            )}
          >
            {workQuality.showedWork ? "✓ Work shown" : "✎ Show steps in the pad"}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
          !solved && !answerReady && !reviewingCompletedProblem && "opacity-0 pointer-events-none",
        )}
      >
          {reviewingCompletedProblem ? (
            <div
              className={cn(
                "rounded-xl p-4 border space-y-3",
                currentStatus === "correct"
                  ? "bg-emerald-50 border-emerald-200"
                  : currentStatus === "incorrect"
                    ? "bg-rose-50 border-rose-200"
                    : "bg-amber-50 border-amber-200",
              )}
            >
              <p className="text-sm font-medium text-slate-800">
                {currentStatus === "correct"
                  ? "✓ You got this one right on the first try."
                  : currentStatus === "incorrect"
                    ? "You got this one wrong before answering correctly."
                    : "↷ You skipped this question earlier."}
              </p>
              <Button type="button" size="lg" className="w-full" onClick={goToNextProblem}>
                {remainingCount > 1 ? "Continue →" : "View summary →"}
              </Button>
            </div>
          ) : solved && feedback ? (
            <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">
                🐯 Tiger Parent says
              </p>
              <p className="font-bold text-base leading-snug text-emerald-900">
                {feedback.roast ?? "Correct!"}
              </p>
              {feedback.explanation && (
                <div className="border-t border-emerald-200/80 pt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                    Why it works
                  </p>
                  <FormattedExplanation text={feedback.explanation} variant="emerald" />
                </div>
              )}
              <Button type="button" size="lg" className="mt-2 w-full" onClick={goToNextProblem}>
                {remainingCount > 1 ? "Next problem →" : "View summary →"}
              </Button>
            </div>
          ) : (
            <>
              {feedback && !feedback.isCorrect && (
                <div className="rounded-xl p-4 bg-rose-50 border border-rose-200 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-800/70">
                    🐯 Tiger Parent says
                  </p>
                  <p className="font-bold text-base leading-snug text-rose-900">
                    {feedback.roast ?? "Not quite — try again."}
                  </p>
                  <p className="text-sm text-rose-800 border-t border-rose-200/80 pt-2">
                    Change your answer and submit again.
                  </p>
                </div>
              )}

              <ProblemAnswerInput
                questionType={current.questionType}
                choices={current.choices}
                orientation="grid"
                revealed={answerReady}
                selected={selected}
                onSelect={(label) => {
                  setSelected(label);
                  clearWrongFeedback();
                }}
                freeResponse={freeResponse}
                onFreeResponseChange={(text) => {
                  setFreeResponse(text);
                  clearWrongFeedback();
                }}
              />

              {submitError && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
                  {submitError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  type="button"
                  size="lg"
                  className={`flex-1 ${answerReady ? "pdf-choice-button" : "opacity-0"}`}
                  style={answerReady ? { animationDelay: `${submitDelayMs}ms` } : undefined}
                  onClick={submit}
                  disabled={checking || !answerReady || !hasAnswer}
                >
                  {checking
                    ? "Submitting…"
                    : needsScratchWork && hasAnswer
                      ? "Show scratch work first"
                      : "Submit Answer"}
                </Button>
                {!alreadyDone && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    className={`sm:shrink-0 text-slate-600 ${answerReady ? "pdf-choice-button" : "opacity-0"}`}
                    style={answerReady ? { animationDelay: `${submitDelayMs + 60}ms` } : undefined}
                    onClick={skip}
                    disabled={checking || !answerReady || needsScratchWork}
                  >
                    {checking ? "Skipping…" : "Skip"}
                  </Button>
                )}
              </div>
            </>
          )}
      </div>
    </div>
  );
}
