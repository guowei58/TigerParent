"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function PopQuizStartButton({
  assignmentId,
  sessionId,
  status,
}: {
  assignmentId: string;
  sessionId: string | null;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (sessionId) {
      router.push(`/student/practice/${sessionId}`);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/student/pop-quizzes/${assignmentId}/start`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.ok && data.sessionId) {
      router.push(`/student/practice/${data.sessionId}`);
    }
  }

  return (
    <Button size="lg" onClick={handleStart} disabled={loading}>
      {loading
        ? "Starting…"
        : sessionId || status === "IN_PROGRESS"
          ? "Continue Pop Quiz"
          : "Start Pop Quiz"}
    </Button>
  );
}

export function PopQuizStudentCard({
  title,
  skillTitles,
  problemCount,
  assignmentId,
  sessionId,
  status,
}: {
  title: string | null;
  skillTitles: string[];
  problemCount: number;
  assignmentId: string;
  sessionId: string | null;
  status: string;
}) {
  return (
    <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle className="text-amber-900">Pop Quiz from your parent 🎯</CardTitle>
        <Badge variant="warning">Required</Badge>
      </div>
      <p className="text-lg font-semibold text-slate-900 mt-2">{title ?? "Pop Quiz"}</p>
      <p className="text-sm text-slate-600 mt-1">
        {problemCount} questions covering: {skillTitles.join(", ")}
      </p>
      <p className="text-sm text-amber-800 mt-3">
        Finish this pop quiz before continuing your regular lessons and practice.
      </p>
      <div className="mt-4">
        <PopQuizStartButton
          assignmentId={assignmentId}
          sessionId={sessionId}
          status={status}
        />
      </div>
    </Card>
  );
}
