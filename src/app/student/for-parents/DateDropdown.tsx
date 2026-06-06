"use client";

import { useRouter } from "next/navigation";
import { todayDateKey } from "@/lib/utils";

type DateDropdownProps = {
  currentDate: string;
  activeDates: string[];
};

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayDateKey();
  const base = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (dateKey === today) return `${base} (today)`;
  return base;
}

export function DateDropdown({ currentDate, activeDates }: DateDropdownProps) {
  const router = useRouter();
  const today = todayDateKey();

  const options = [...new Set([today, currentDate, ...activeDates])].sort().reverse();

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Date</span>
      <select
        value={currentDate}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/student/for-parents?date=${e.target.value}`);
          }
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((dateKey) => (
          <option key={dateKey} value={dateKey}>
            {formatDateLabel(dateKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
