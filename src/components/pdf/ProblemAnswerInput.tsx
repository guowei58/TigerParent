"use client";

import { isMcqQuestion } from "@/lib/pdf/isMcqQuestion";

export { isMcqQuestion };

export function mcqChoiceLabels(choices: { label: string }[]): string[] {
  if (choices.length > 0) {
    return choices.map((c) => c.label.toUpperCase());
  }
  return ["A", "B", "C", "D"];
}

type Props = {
  questionType: string;
  choices: { label: string; text?: string | null }[];
  mode?: "interactive" | "preview";
  /** horizontal = wrap row; vertical = stack; grid = 2×2 / 4-across for bottom bar */
  orientation?: "horizontal" | "vertical" | "grid";
  /** When true, choices fade in with a short stagger (after the problem image loads). */
  revealed?: boolean;
  selected?: string | null;
  onSelect?: (label: string) => void;
  freeResponse?: string;
  onFreeResponseChange?: (value: string) => void;
};

export function ProblemAnswerInput({
  questionType,
  choices,
  mode = "interactive",
  orientation = "horizontal",
  revealed = true,
  selected,
  onSelect,
  freeResponse = "",
  onFreeResponseChange,
}: Props) {
  const interactive = mode === "interactive";
  const mcq = isMcqQuestion(questionType, choices);
  const labels = mcqChoiceLabels(choices);

  if (mcq) {
    const containerClass =
      orientation === "vertical"
        ? "flex flex-col gap-2"
        : orientation === "grid"
          ? "grid grid-cols-2 sm:grid-cols-4 gap-2 w-full"
          : "flex flex-wrap gap-2";

    return (
      <div className={containerClass}>
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(label)}
            style={
              revealed && interactive
                ? { animationDelay: `${120 + index * 70}ms` }
                : undefined
            }
            className={`rounded-xl px-4 py-3 border font-semibold text-lg transition-colors duration-200 ${
              orientation === "vertical" || orientation === "grid"
                ? "w-full text-center"
                : "min-w-[3rem]"
            } ${
              selected === label
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white border-slate-200 text-slate-800"
            } ${
              !interactive
                ? "opacity-80 cursor-default"
                : revealed
                  ? "pdf-choice-button hover:border-indigo-300"
                  : "opacity-0 pointer-events-none"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={revealed ? "pdf-answer-panel" : "opacity-0 pointer-events-none"}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Your answer</label>
      <textarea
        rows={3}
        readOnly={!interactive}
        value={freeResponse}
        onChange={(e) => onFreeResponseChange?.(e.target.value)}
        placeholder={interactive ? "Type your answer here…" : "Short answer / open response"}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white disabled:bg-slate-50"
      />
    </div>
  );
}
