"use client";

import type { StudentProfile, StudentSettings, StudentSubjectPlacement, Subject, Level, Skill } from "@/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LevelWithSkills = Level & { skills: Skill[] };

export function PlacementForm({
  student,
  subjects,
  levels,
}: {
  student: StudentProfile & {
    placements: (StudentSubjectPlacement & { subject: Subject })[];
    settings: StudentSettings | null;
  };
  subjects: Subject[];
  levels: LevelWithSkills[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    await fetch(`/api/parent/students/${student.id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolGrade: parseInt(String(form.get("schoolGrade")), 10),
        dailyGoalMinutes: parseInt(String(form.get("dailyGoalMinutes")), 10),
        targetAheadMonths: parseInt(String(form.get("targetAheadMonths")), 10),
        autoAdvance: form.get("autoAdvance") === "on",
        weekendEnabled: form.get("weekendEnabled") === "on",
        difficultyAdjust: parseInt(String(form.get("difficultyAdjust")), 10),
      }),
    });

    for (const subject of subjects) {
      const levelId = String(form.get(`level-${subject.id}`));
      const skillId = String(form.get(`skill-${subject.id}`));
      if (levelId && skillId) {
        await fetch(`/api/parent/students/${student.id}/placement`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectId: subject.id, levelId, skillId }),
        });
      }
    }

    router.refresh();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSave} className="mt-4 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="School Grade" name="schoolGrade" type="number" defaultValue={String(student.schoolGrade)} />
        <Field label="Daily Goal (min)" name="dailyGoalMinutes" type="number" defaultValue={String(student.dailyGoalMinutes)} />
        <Field label="Target Ahead (months)" name="targetAheadMonths" type="number" defaultValue={String(student.targetAheadMonths)} />
        <Field label="Difficulty Adjust (-2 to +2)" name="difficultyAdjust" type="number" defaultValue={String(student.settings?.difficultyAdjust ?? 0)} />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="autoAdvance" defaultChecked={student.settings?.autoAdvance ?? true} />
        Auto-advance after mastery
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="weekendEnabled" defaultChecked={student.settings?.weekendEnabled ?? true} />
        Weekend practice enabled
      </label>

      {subjects.map((subject) => {
        const placement = student.placements.find((p) => p.subjectId === subject.id);
        const subjectLevels = levels.filter((l) => l.subjectId === subject.id);
        return (
          <div key={subject.id} className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold mb-3">{subject.name} Placement</p>
            <div className="grid gap-3">
              <div>
                <label className="text-sm text-slate-500">Level</label>
                <select name={`level-${subject.id}`} defaultValue={placement?.currentLevelId ?? ""} className="w-full rounded-xl border px-3 py-2">
                  {subjectLevels.map((l) => (
                    <option key={l.id} value={l.id}>Grade {l.nominalGradeLevel}: {l.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">Starting Skill</label>
                <select name={`skill-${subject.id}`} defaultValue={placement?.currentSkillId ?? ""} className="w-full rounded-xl border px-3 py-2">
                  {subjectLevels.flatMap((l) =>
                    l.skills.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    )),
                  )}
                </select>
              </div>
            </div>
          </div>
        );
      })}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

function Field({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="w-full rounded-xl border px-3 py-2" />
    </div>
  );
}
