import { cn } from "@/lib/utils";

type ParsedPassagePrompt = {
  instruction: string;
  title: string;
  body: string;
  question: string;
};

export function parsePassagePrompt(prompt: string): ParsedPassagePrompt | null {
  const structured = prompt.match(
    /^Read the passage:\s*\n+"([^"]+)"\s*\n([\s\S]*?)\n\n([\s\S]+)$/,
  );
  if (structured) {
    return {
      instruction: "Read the passage:",
      title: structured[1]!.trim(),
      body: structured[2]!.trim(),
      question: structured[3]!.trim(),
    };
  }

  const inline = prompt.match(/^Read the passage:\s*"([^"]+)"\s+([\s\S]+)$/);
  if (!inline) return null;

  const rest = inline[2]!.trim();
  const questionStart = rest.search(
    /\s+(Which|What|Who|How|Why|In one sentence|Write|Choose|Select|Explain)\b/,
  );
  if (questionStart <= 0) return null;

  return {
    instruction: "Read the passage:",
    title: inline[1]!.trim(),
    body: rest.slice(0, questionStart).trim(),
    question: rest.slice(questionStart).trim(),
  };
}

type ProblemPromptDisplayProps = {
  prompt: string;
  className?: string;
  compact?: boolean;
};

export function ProblemPromptDisplay({
  prompt,
  className,
  compact = false,
}: ProblemPromptDisplayProps) {
  const passage = parsePassagePrompt(prompt);

  if (!passage) {
    return (
      <div className={cn("whitespace-pre-line leading-relaxed", className)}>
        {prompt}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-slate-500">{passage.instruction}</p>
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-slate-50/90",
          compact ? "p-3 space-y-2" : "p-4 space-y-3",
        )}
      >
        <p
          className={cn(
            "font-semibold text-slate-900",
            compact ? "text-sm" : "text-base",
          )}
        >
          {passage.title}
        </p>
        <p
          className={cn(
            "text-slate-700 leading-relaxed",
            compact ? "text-sm" : "text-base",
          )}
        >
          {passage.body}
        </p>
      </div>
      <p
        className={cn(
          "font-semibold text-slate-900 leading-snug",
          compact ? "text-sm" : "text-lg",
        )}
      >
        {passage.question}
      </p>
    </div>
  );
}
