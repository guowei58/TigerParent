import {
  parseExplanationSteps,
  stepBodyLines,
} from "@/lib/pdf/formatExplanation";

type Props = {
  text: string;
  className?: string;
  /** Accent for step badges (student correct = emerald, admin = slate). */
  variant?: "emerald" | "slate";
};

export function FormattedExplanation({
  text,
  className = "",
  variant = "emerald",
}: Props) {
  const steps = parseExplanationSteps(text);
  const badgeClass =
    variant === "emerald"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-100 text-slate-700";
  const textClass =
    variant === "emerald" ? "text-emerald-900/90" : "text-slate-700";

  if (steps.length <= 1) {
    const { main, bullets } = stepBodyLines(steps[0]?.body ?? text);
    return (
      <div className={`text-sm leading-relaxed space-y-2 ${textClass} ${className}`}>
        <p>{main}</p>
        {bullets.length > 0 && (
          <ul className="list-disc list-inside space-y-1 pl-1 text-sm opacity-90">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <ol className={`list-none space-y-4 ${className}`}>
      {steps.map((step, i) => {
        const { main, bullets } = stepBodyLines(step.body);
        return (
          <li key={i} className="flex gap-3">
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-full text-sm font-semibold flex items-center justify-center ${badgeClass}`}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className={`min-w-0 flex-1 text-sm leading-relaxed space-y-2 ${textClass}`}>
              <p>{main}</p>
              {bullets.length > 0 && (
                <ul className="list-disc list-inside space-y-1 pl-1 opacity-90">
                  {bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
