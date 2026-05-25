"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function MarkMistakeDayReviewedButton({
  subjectId,
  dateKey,
  reviewed,
}: {
  subjectId: string;
  dateKey: string;
  reviewed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(reviewed);

  async function handleMarkReviewed() {
    setLoading(true);
    try {
      const res = await fetch("/api/student/mistake-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, dateKey }),
      });
      if (!res.ok) throw new Error("Failed to mark reviewed");
      setDone(true);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
        ✓ Marked as reviewed for {dateKey}
      </p>
    );
  }

  return (
    <Button size="sm" onClick={handleMarkReviewed} disabled={loading}>
      {loading ? "Saving..." : "Mark this day as reviewed"}
    </Button>
  );
}
