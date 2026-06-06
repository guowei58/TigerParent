import { FormattedExplanation } from "@/components/pdf/FormattedExplanation";

export function OpenResponseRevealPanel({
  sampleAnswer,
  explanation,
}: {
  sampleAnswer: string | null;
  explanation: string | null;
}) {
  if (!sampleAnswer && !explanation) return null;

  return (
    <>
      {sampleAnswer && (
        <div className="border-t border-slate-200 pt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Answer
          </p>
          <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {sampleAnswer}
          </p>
        </div>
      )}
      {explanation && (
        <div className="border-t border-slate-200 pt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Explanation
          </p>
          <FormattedExplanation text={explanation} variant="slate" />
        </div>
      )}
    </>
  );
}
