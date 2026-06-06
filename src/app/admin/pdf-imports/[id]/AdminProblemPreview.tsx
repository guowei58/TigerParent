"use client";

import { ProblemAnswerInput } from "@/components/pdf/ProblemAnswerInput";

export function AdminProblemPreview({
  questionType,
  choices,
  showChoiceText = false,
  orientation = "grid",
}: {
  questionType: string;
  choices: { label: string; text: string | null }[];
  showChoiceText?: boolean;
  orientation?: "horizontal" | "vertical" | "grid";
}) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-2">Student answer input</p>
      <ProblemAnswerInput
        questionType={questionType}
        choices={choices}
        mode="preview"
        showChoiceText={showChoiceText}
        orientation={orientation}
        revealed
      />
    </div>
  );
}
