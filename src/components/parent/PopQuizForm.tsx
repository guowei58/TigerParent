"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { popQuizProblemCount } from "@/lib/pop-quiz-utils";

type SkillOption = {
  id: string;
  title: string;
  levelTitle: string;
  grade: number;
};

type SubjectSkills = {
  subjectId: string;
  subjectName: string;
  skills: SkillOption[];
};

type PendingQuiz = {
  id: string;
  title: string | null;
  status: string;
  skillTitles: string[];
};

export function PopQuizForm({
  studentId,
  studentName,
  subjects,
  pending,
}: {
  studentId: string;
  studentName: string;
  subjects: SubjectSkills[];
  pending: PendingQuiz | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCount = selected.size;
  const problemCount = popQuizProblemCount(selectedCount);

  const selectedLabels = useMemo(() => {
    const labels: string[] = [];
    for (const subject of subjects) {
      for (const skill of subject.skills) {
        if (selected.has(skill.id)) labels.push(skill.title);
      }
    }
    return labels;
  }, [selected, subjects]);

  function toggleSkill(skillId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
    setError(null);
  }

  async function handleSendPopQuiz() {
    if (selectedCount === 0) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/parent/students/${studentId}/pop-quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillIds: [...selected] }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send pop quiz");
      return;
    }

    setMessage(`Pop quiz sent to ${studentName}! They must finish it before continuing their work.`);
    setSelected(new Set());
    router.refresh();
  }

  async function handleCancel() {
    if (!pending) return;
    setLoading(true);
    setError(null);

    const res = await fetch(
      `/api/parent/students/${studentId}/pop-quizzes?assignmentId=${pending.id}`,
      { method: "DELETE" },
    );

    setLoading(false);
    if (!res.ok) {
      setError("Could not cancel pop quiz");
      return;
    }

    setMessage("Pop quiz cancelled.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {pending && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-amber-900">Active pop quiz waiting</p>
              <p className="text-sm text-amber-800 mt-1">{pending.title}</p>
              <p className="text-xs text-amber-700 mt-1">
                Lessons: {pending.skillTitles.join(", ")}
              </p>
            </div>
            <Badge variant="warning">{pending.status}</Badge>
          </div>
          <Button size="sm" variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel pop quiz
          </Button>
        </div>
      )}

      {message && (
        <p className="rounded-xl bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">{message}</p>
      )}
      {error && (
        <p className="rounded-xl bg-rose-50 text-rose-800 px-4 py-3 text-sm">{error}</p>
      )}

      <p className="text-slate-600 text-sm">
        Pick one or more lessons for {studentName}&apos;s pop quiz. Once sent, they must complete
        it before resuming regular practice.
      </p>

      {subjects.map((subject) => (
        <div key={subject.subjectId} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-indigo-800 mb-3">{subject.subjectName}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {subject.skills.map((skill) => {
              const checked = selected.has(skill.id);
              return (
                <label
                  key={skill.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-200"
                  } ${pending ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={Boolean(pending)}
                    onChange={() => toggleSkill(skill.id)}
                  />
                  <span>
                    <span className="font-medium text-slate-900">{skill.title}</span>
                    <span className="block text-xs text-slate-500">
                      Grade {skill.grade} · {skill.levelTitle}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {selectedCount > 0 && !pending && (
        <div className="sticky bottom-4 rounded-2xl border-2 border-indigo-300 bg-white p-4 shadow-lg space-y-3">
          <p className="font-semibold text-indigo-900">
            {selectedCount} lesson{selectedCount === 1 ? "" : "s"} selected · {problemCount} questions
          </p>
          <p className="text-sm text-slate-600">{selectedLabels.join(" · ")}</p>
          <Button size="lg" onClick={handleSendPopQuiz} disabled={loading}>
            {loading ? "Sending…" : "Send Pop Quiz 🎯"}
          </Button>
        </div>
      )}
    </div>
  );
}
