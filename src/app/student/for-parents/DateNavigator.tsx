"use client";

import { useRouter } from "next/navigation";
import { addDaysToDateKey, todayDateKey } from "@/lib/utils";

type DateNavigatorProps = {
  currentDate: string;
  activeDates: string[];
};

export function DateNavigator({ currentDate, activeDates }: DateNavigatorProps) {
  const router = useRouter();
  const today = todayDateKey();
  const isToday = currentDate === today;

  function navigate(dateKey: string) {
    router.push(`/student/for-parents?date=${dateKey}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(addDaysToDateKey(currentDate, -1))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ← Previous
      </button>
      <input
        type="date"
        value={currentDate}
        max={today}
        onChange={(e) => {
          if (e.target.value) navigate(e.target.value);
        }}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
      />
      <button
        type="button"
        onClick={() => navigate(addDaysToDateKey(currentDate, 1))}
        disabled={isToday}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
      {!isToday && (
        <button
          type="button"
          onClick={() => navigate(today)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Today
        </button>
      )}
      {activeDates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {activeDates.slice(0, 7).map((dateKey) => (
            <button
              key={dateKey}
              type="button"
              onClick={() => navigate(dateKey)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                dateKey === currentDate
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {formatShortDate(dateKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatShortDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
