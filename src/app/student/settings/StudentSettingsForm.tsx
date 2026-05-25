"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";

type StudentSettingsFormProps = {
  initialDisplayName: string;
  initialSchoolGrade: number;
  onboarding: boolean;
};

export function StudentSettingsForm({
  initialDisplayName,
  initialSchoolGrade,
  onboarding,
}: StudentSettingsFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [schoolGrade, setSchoolGrade] = useState(String(initialSchoolGrade));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/student/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        schoolGrade: parseInt(schoolGrade, 10),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not save. Try again.");
      setLoading(false);
      return;
    }

    router.push("/student");
    router.refresh();
  };

  return (
    <Card className="space-y-4">
      <CardTitle className="text-2xl">
        {onboarding ? "Welcome to TigerParent!" : "Your Settings"}
      </CardTitle>
      <p className="text-slate-600">
        {onboarding
          ? "Tell us your name and grade so we can pick the right lessons for you."
          : "Update your name or grade if something changed."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Your name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            required
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Your grade
          </label>
          <select
            value={schoolGrade}
            onChange={(e) => setSchoolGrade(e.target.value)}
            required
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none bg-white"
          >
            {Array.from({ length: 10 }, (_, i) => i + 3).map((g) => (
              <option key={g} value={g}>
                {g === 3 ? "3rd Grade" : `${g}th Grade`}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading
            ? "Saving..."
            : onboarding
              ? "Start Learning →"
              : "Save Settings"}
        </Button>
      </form>
    </Card>
  );
}
