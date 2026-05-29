"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ProgressState = {
  status: string;
  currentStep: string | null;
  progressPercent: number;
  completed: boolean;
  errorMessage: string | null;
  totalProblemsDetected: number | null;
};

const STEP_LABELS: Record<string, string> = {
  uploaded: "Queued",
  rendering_pages: "Rendering PDF pages",
  extracting_text: "Extracting text",
  detecting_problem_regions: "Detecting problems",
  cropping_problem_images: "Cropping problem images",
  parsing_problems: "Saving problems",
  parsing_answer_key: "Parsing answer key",
  matching_answers: "Matching answers",
  classifying_concepts: "Classifying concepts",
  generating_explanations: "Generating explanations",
  needs_review: "Complete — ready for review",
  completed: "Complete",
  failed: "Failed",
};

function labelFor(step: string | null, status: string): string {
  if (!step) return STEP_LABELS[status] ?? status;
  if (step.includes("(")) return step.replace(/_/g, " ");
  return STEP_LABELS[step] ?? step.replace(/_/g, " ");
}

export function IngestionProgressBar({
  documentId,
  initial,
}: {
  documentId: string;
  initial: ProgressState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [polling, setPolling] = useState(!initial.completed);

  const fetchProgress = useCallback(async () => {
    const res = await fetch(`/api/admin/pdf-imports/${documentId}/progress`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    setState({
      status: data.status,
      currentStep: data.currentStep,
      progressPercent: data.progressPercent ?? 0,
      completed: data.completed,
      errorMessage: data.errorMessage,
      totalProblemsDetected: data.totalProblemsDetected,
    });
    if (data.completed) {
      setPolling(false);
      router.refresh();
    }
  }, [documentId, router]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(fetchProgress, 2000);
    fetchProgress();
    return () => clearInterval(id);
  }, [polling, fetchProgress]);

  const pct = Math.max(0, Math.min(100, state.progressPercent));
  const inProgress = polling && !state.completed;

  if (state.completed && state.status === "needs_review" && initial.completed) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-2 ${
        state.status === "failed"
          ? "border-red-200 bg-red-50"
          : inProgress
            ? "border-indigo-200 bg-indigo-50"
            : "border-emerald-200 bg-emerald-50"
      }`}
      data-polling={polling ? "true" : "false"}
    >
      <div className="flex justify-between items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">
          {inProgress ? "Ingestion in progress…" : labelFor(state.currentStep, state.status)}
        </span>
        <span className="tabular-nums text-slate-600">{pct}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-white/80 overflow-hidden border border-slate-200">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            state.status === "failed"
              ? "bg-red-500"
              : state.completed
                ? "bg-emerald-500"
                : "bg-indigo-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-600">
        {labelFor(state.currentStep, state.status)}
        {state.totalProblemsDetected != null && state.totalProblemsDetected > 0
          ? ` · ${state.totalProblemsDetected} problems`
          : ""}
      </p>
      {state.errorMessage && (
        <p className="text-xs text-red-700">{state.errorMessage}</p>
      )}
      {inProgress && (
        <p className="text-xs text-slate-500">Updates every few seconds. Large PDFs can take several minutes.</p>
      )}
    </div>
  );
}

/** Call after retry/upload to start polling from the client. */
export function useIngestionPollingTrigger() {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent("pdf-ingestion-started"));
  }, []);
}

export function IngestionProgressListener({
  documentId,
  initial,
  startPolling = false,
}: {
  documentId: string;
  initial: ProgressState;
  startPolling?: boolean;
}) {
  const [forceShow, setForceShow] = useState(startPolling);

  useEffect(() => {
    const onStart = () => setForceShow(true);
    window.addEventListener("pdf-ingestion-started", onStart);
    return () => window.removeEventListener("pdf-ingestion-started", onStart);
  }, []);

  const show = forceShow || !initial.completed || initial.status === "failed";

  if (!show && initial.completed) return null;

  return (
    <IngestionProgressBar
      documentId={documentId}
      initial={forceShow ? { ...initial, completed: false, progressPercent: 0, status: "uploaded" } : initial}
    />
  );
}
