"use client";

import { useState } from "react";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import type { RoadmapLevel } from "@/lib/curriculum-roadmap";

type ExpandableLevelDetailProps = {
  level: RoadmapLevel;
  defaultExpanded?: boolean;
  previewCount?: number;
};

export function ExpandableLevelDetail({
  level,
  defaultExpanded = false,
  previewCount = 4,
}: ExpandableLevelDetailProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const progress =
    level.totalSkills > 0 ? (level.masteredCount / level.totalSkills) * 100 : 0;
  const skillsToShow = expanded ? level.skills : level.skills.slice(0, previewCount);

  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">
            Grade {level.nominalGradeLevel}: {level.title}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {level.isSchoolGrade && (
              <Badge variant="warning">School grade</Badge>
            )}
            {level.isTargetGrade && (
              <Badge variant="info">Ahead goal</Badge>
            )}
            {level.phase === "current" && <Badge variant="info">Current</Badge>}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {level.totalSkills} concept{level.totalSkills === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-2">
        <ProgressBar value={progress} />
      </div>

      {skillsToShow.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {skillsToShow.map((skill) => (
            <li
              key={skill.id}
              className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 ${
                skill.phase === "current"
                  ? "bg-indigo-100 text-indigo-950 font-medium"
                  : skill.phase === "past"
                    ? "text-emerald-800"
                    : "text-slate-600"
              }`}
            >
              <span className="shrink-0 w-4 text-center text-slate-400">○</span>
              <span className="flex-1">{skill.title}</span>
            </li>
          ))}
        </ul>
      )}

      {level.skills.length > previewCount && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          {expanded
            ? "Show fewer"
            : `Show all ${level.skills.length} concepts`}
        </button>
      )}
    </div>
  );
}
