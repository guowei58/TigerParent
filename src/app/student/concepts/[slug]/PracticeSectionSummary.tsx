import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Props = {
  conceptName: string;
  domain: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  onReviewWork?: () => void;
};

export function PracticeSectionSummary({
  conceptName,
  domain,
  total,
  correct,
  incorrect,
  skipped,
  onReviewWork,
}: Props) {
  const finished = correct + incorrect + skipped;
  const firstTryPct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Section complete
        </p>
        <h2 className="text-xl font-bold text-slate-900 mt-1">{conceptName}</h2>
        <p className="text-sm text-slate-500">{domain}</p>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Total</dt>
          <dd className="text-2xl font-bold text-slate-900">{total}</dd>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <dt className="text-xs text-emerald-700">Correct first try</dt>
          <dd className="text-2xl font-bold text-emerald-800">{correct}</dd>
        </div>
        <div className="rounded-xl bg-rose-50 p-3">
          <dt className="text-xs text-rose-700">Wrong then fixed</dt>
          <dd className="text-2xl font-bold text-rose-800">{incorrect}</dd>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <dt className="text-xs text-amber-700">Skipped</dt>
          <dd className="text-2xl font-bold text-amber-800">{skipped}</dd>
        </div>
      </dl>

      <p className="text-sm text-slate-600">
        You finished <strong>{finished}</strong> of <strong>{total}</strong> questions:{" "}
        <strong>{correct}</strong> right on the first try, <strong>{incorrect}</strong> wrong before
        getting it right
        {skipped > 0 ? (
          <>
            , and <strong>{skipped}</strong> skipped
          </>
        ) : null}
        . ({firstTryPct}% first-try correct.)
      </p>

      <div className="flex flex-wrap gap-3">
        {onReviewWork && finished > 0 && (
          <Button type="button" size="lg" onClick={onReviewWork}>
            Review your work
          </Button>
        )}
        <Link href="/student/concepts">
          <Button type="button" size="lg" variant={onReviewWork && finished > 0 ? "secondary" : undefined}>
            Back to Practice by Topics
          </Button>
        </Link>
        <Link href="/student">
          <Button type="button" size="lg" variant="secondary">
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
