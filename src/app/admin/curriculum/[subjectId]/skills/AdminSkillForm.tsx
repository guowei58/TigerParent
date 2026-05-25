"use client";

import type { Level } from "@/generated/prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export function AdminSkillForm({ subjectId, levels }: { subjectId: string; levels: Level[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardTitle>Add Skill</CardTitle>
      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const form = new FormData(e.currentTarget);
          await fetch("/api/admin/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectId,
              levelId: form.get("levelId"),
              title: form.get("title"),
              description: form.get("description"),
              nominalGradeLevel: parseInt(String(form.get("grade")), 10),
              sequence: parseInt(String(form.get("sequence")), 10),
            }),
          });
          router.refresh();
          setLoading(false);
        }}
      >
        <input name="title" placeholder="Skill title" required className="rounded-xl border px-3 py-2" />
        <input name="description" placeholder="Description" className="rounded-xl border px-3 py-2" />
        <select name="levelId" required className="rounded-xl border px-3 py-2">
          {levels.map((l) => (
            <option key={l.id} value={l.id}>Grade {l.nominalGradeLevel}: {l.title}</option>
          ))}
        </select>
        <input name="grade" type="number" placeholder="Grade level" required className="rounded-xl border px-3 py-2" />
        <input name="sequence" type="number" placeholder="Sequence" required className="rounded-xl border px-3 py-2" />
        <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Skill"}</Button>
      </form>
    </Card>
  );
}
