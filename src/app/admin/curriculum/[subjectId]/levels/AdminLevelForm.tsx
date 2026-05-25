"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export function AdminLevelForm({ subjectId, trackId }: { subjectId: string; trackId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardTitle>Add Level</CardTitle>
      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const form = new FormData(e.currentTarget);
          await fetch("/api/admin/levels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectId,
              curriculumTrackId: trackId,
              nominalGradeLevel: parseInt(String(form.get("grade")), 10),
              title: form.get("title"),
              description: form.get("description"),
              sequence: parseInt(String(form.get("sequence")), 10),
            }),
          });
          router.refresh();
          setLoading(false);
        }}
      >
        <input name="title" placeholder="Level title" required className="rounded-xl border px-3 py-2" />
        <input name="description" placeholder="Description" className="rounded-xl border px-3 py-2" />
        <input name="grade" type="number" placeholder="Grade level" required className="rounded-xl border px-3 py-2" />
        <input name="sequence" type="number" placeholder="Sequence" required className="rounded-xl border px-3 py-2" />
        <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Level"}</Button>
      </form>
    </Card>
  );
}
