"use client";

import type { Skill } from "@/generated/prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

type SkillWithSubject = Skill & { subject: { name: string } };

export function AdminProblemForm({ skills }: { skills: SkillWithSubject[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardTitle>Add / Generate Problem</CardTitle>
      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const form = new FormData(e.currentTarget);
          await fetch("/api/admin/problems", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              skillId: form.get("skillId"),
              type: form.get("type"),
              prompt: form.get("prompt"),
              correctAnswer: form.get("correctAnswer"),
              explanation: form.get("explanation"),
              gradeLevel: parseInt(String(form.get("gradeLevel")), 10),
              requiresScratchpad: form.get("requiresScratchpad") === "on",
            }),
          });
          router.refresh();
          setLoading(false);
        }}
      >
        <select name="skillId" required className="rounded-xl border px-3 py-2">
          {skills.map((s) => (
            <option key={s.id} value={s.id}>{s.subject.name} · {s.title}</option>
          ))}
        </select>
        <select name="type" className="rounded-xl border px-3 py-2">
          <option value="NUMERIC">Numeric</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="SHORT_ANSWER">Short Answer</option>
          <option value="WRITTEN_RESPONSE">Written Response</option>
        </select>
        <textarea name="prompt" placeholder="Problem prompt" required className="rounded-xl border px-3 py-2" rows={3} />
        <input name="correctAnswer" placeholder="Correct answer" required className="rounded-xl border px-3 py-2" />
        <textarea name="explanation" placeholder="Explanation" className="rounded-xl border px-3 py-2" rows={2} />
        <input name="gradeLevel" type="number" placeholder="Grade level" required className="rounded-xl border px-3 py-2" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requiresScratchpad" /> Requires scratchpad
        </label>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Problem"}</Button>
        <Button type="button" variant="secondary" disabled title="AI generation requires admin review before student access">
          Generate More Practice (Coming Soon)
        </Button>
      </form>
    </Card>
  );
}
