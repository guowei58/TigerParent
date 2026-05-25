"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function AddStudentForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/parent/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        displayName: String(form.get("displayName") || "New Student"),
        email: form.get("email"),
        schoolGrade: parseInt(String(form.get("schoolGrade") || "4"), 10),
        dailyGoalMinutes: parseInt(String(form.get("dailyGoalMinutes")), 10),
        targetAheadMonths: parseInt(String(form.get("targetAheadMonths")), 10),
      }),
    });

    if (!res.ok) {
      setError("Failed to create student");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/parent/student/${data.studentId}`);
  };

  return (
    <Card>
      <CardTitle className="text-xl mb-4">Add Student Account</CardTitle>
      <p className="text-sm text-slate-500">
        The student will enter their name and grade on first login.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <Field label="Login Email" name="email" type="email" required />
        <Field
          label="Temporary name (optional)"
          name="displayName"
          defaultValue="New Student"
        />
        <Field
          label="Starting grade hint (optional)"
          name="schoolGrade"
          type="number"
          defaultValue="4"
        />
        <Field label="Daily Goal (minutes)" name="dailyGoalMinutes" type="number" defaultValue="30" />
        <Field label="Target Ahead (months)" name="targetAheadMonths" type="number" defaultValue="6" />
        {error && <p className="text-rose-600 text-sm">{error}</p>}
        <p className="text-xs text-slate-400">Default password: demo1234 (change after first login)</p>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Student"}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
