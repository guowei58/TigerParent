import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import { ExpandableLevelDetail } from "@/components/ExpandableLevelDetail";
import { gradeLabel } from "@/lib/utils";
import type { CurriculumRoadmapData, RoadmapLevel } from "@/lib/curriculum-roadmap";

type CurriculumRoadmapProps = {
  data: CurriculumRoadmapData;
};

export function CurriculumRoadmap({ data }: CurriculumRoadmapProps) {
  return (
    <Card className="border-violet-200">
      <CardTitle>Learning Plan Roadmap</CardTitle>
      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
        Tiger Parent builds a linear path through every concept — starting at school
        grade, then pushing{" "}
        <strong>6–12 months ahead</strong>{" "}
        so school work feels easy. Below is
        where your child has been, where they are now, and what&apos;s coming next.
      </p>
      <p className="text-xs text-slate-500 mt-2">
        Family goal: stay at least {data.targetAheadMonths} grade levels ahead of{" "}
        {gradeLabel(data.schoolGrade)}.
      </p>

      <div className="mt-5 space-y-8">
        {data.subjects.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects enabled yet.</p>
        ) : (
          data.subjects.map((subject) => (
            <SubjectRoadmapSection key={subject.subjectId} subject={subject} />
          ))
        )}
      </div>
    </Card>
  );
}

function SubjectRoadmapSection({
  subject,
}: {
  subject: CurriculumRoadmapData["subjects"][number];
}) {
  const currentLevel = subject.levels.find((l) => l.phase === "current");
  const pastLevels = subject.levels.filter((l) => l.phase === "past");
  const upcomingLevels = subject.upcomingLevels;
  const visibleUpcoming = upcomingLevels.slice(0, 3);
  const hiddenUpcomingCount = Math.max(
    0,
    upcomingLevels.length - visibleUpcoming.length,
  );

  const overallProgress =
    subject.totalSkills > 0
      ? (subject.totalMastered / subject.totalSkills) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-violet-900">{subject.subjectName}</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            {subject.currentLevelTitle ?? "Getting started"}
            {subject.currentSkillTitle && (
              <span className="text-indigo-600"> · {subject.currentSkillTitle}</span>
            )}
          </p>
        </div>
        <Badge variant={subject.onTrack ? "success" : "warning"}>
          {subject.onTrack
            ? "On track for ahead goal"
            : `${Math.max(0, subject.targetAheadMonths - subject.monthsAheadOrBehind)} levels to goal`}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Metric label="School grade" value={`Grade ${subject.schoolGrade}`} />
        <Metric
          label="Working at"
          value={`Grade ${subject.assessedGradeLevel}`}
          highlight
        />
        <Metric label="Goal grade" value={`Grade ${subject.targetGradeLevel}`} />
        <Metric
          label="Ahead of school"
          value={
            subject.monthsAheadOrBehind >= 0
              ? `+${subject.monthsAheadOrBehind} levels`
              : `${subject.monthsAheadOrBehind} levels`
          }
          positive={subject.monthsAheadOrBehind >= 0}
        />
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Overall curriculum progress</span>
          <span>
            {subject.totalMastered}/{subject.totalSkills} skills mastered
          </span>
        </div>
        <ProgressBar value={overallProgress} />
      </div>

      {pastLevels.length > 0 && (
        <RoadmapSection title="Where they've been" tone="past">
          {pastLevels.length > 2 ? (
            <>
              <CollapsedLevelsSummary levels={pastLevels.slice(0, -1)} />
              <LevelDetail level={pastLevels[pastLevels.length - 1]!} compact />
            </>
          ) : (
            pastLevels.map((level) => (
              <LevelDetail key={level.id} level={level} compact />
            ))
          )}
        </RoadmapSection>
      )}

      {currentLevel && (
        <RoadmapSection title="Where they are now" tone="current">
          <LevelDetail level={currentLevel} expanded />
        </RoadmapSection>
      )}

      {visibleUpcoming.length > 0 && (
        <RoadmapSection title="Where they're headed" tone="future">
          {visibleUpcoming.map((level) => (
            <ExpandableLevelDetail key={level.id} level={level} />
          ))}
          {hiddenUpcomingCount > 0 && (
            <p className="text-sm text-slate-500 italic">
              + {hiddenUpcomingCount} more grade level
              {hiddenUpcomingCount === 1 ? "" : "s"} after that — full path continues
              through Grade{" "}
              {upcomingLevels[upcomingLevels.length - 1]?.nominalGradeLevel}.
            </p>
          )}
        </RoadmapSection>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2 ${
        highlight ? "bg-indigo-50 border border-indigo-100" : "bg-slate-50"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`font-semibold ${
          positive === false
            ? "text-rose-700"
            : positive
              ? "text-emerald-700"
              : highlight
                ? "text-indigo-800"
                : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RoadmapSection({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "past" | "current" | "future";
  children: React.ReactNode;
}) {
  const border =
    tone === "past"
      ? "border-emerald-100"
      : tone === "current"
        ? "border-indigo-200"
        : "border-slate-200";
  const bg =
    tone === "past"
      ? "bg-emerald-50/40"
      : tone === "current"
        ? "bg-indigo-50/50"
        : "bg-slate-50/60";

  return (
    <div className={`mt-5 rounded-xl border ${border} ${bg} p-3 md:p-4`}>
      <p className="text-sm font-semibold text-slate-800 mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CollapsedLevelsSummary({
  levels,
}: {
  levels: RoadmapLevel[];
}) {
  const mastered = levels.reduce((sum, l) => sum + l.masteredCount, 0);
  const total = levels.reduce((sum, l) => sum + l.totalSkills, 0);
  const gradeRange =
    levels.length > 0
      ? `Grades ${levels[0]!.nominalGradeLevel}–${levels[levels.length - 1]!.nominalGradeLevel}`
      : "Earlier grades";

  return (
    <div className="rounded-lg bg-emerald-50/80 border border-emerald-100 px-3 py-2 text-sm">
      <p className="font-medium text-emerald-900">{gradeRange}</p>
      <p className="text-emerald-700 text-xs mt-0.5">
        {mastered}/{total} skills mastered across {levels.length} earlier level
        {levels.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function LevelDetail({
  level,
  compact,
  expanded,
}: {
  level: RoadmapLevel;
  compact?: boolean;
  expanded?: boolean;
}) {
  const progress =
    level.totalSkills > 0 ? (level.masteredCount / level.totalSkills) * 100 : 0;
  const skillsToShow = expanded
    ? level.skills
    : compact
      ? level.skills
          .filter((s) => s.phase === "past" || s.phase === "current")
          .slice(-3)
      : level.skills.slice(0, 4);

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
          {level.masteredCount}/{level.totalSkills} mastered
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
                    : "text-slate-500"
              }`}
            >
              <span className="shrink-0 w-4 text-center">
                {skill.mastered ? "✓" : skill.phase === "current" ? "●" : "○"}
              </span>
              <span className="flex-1">{skill.title}</span>
              {skill.phase === "current" && skill.masteryScore != null && (
                <span className="text-xs text-indigo-600">
                  {Math.round(skill.masteryScore * 100)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!expanded && level.skills.length > skillsToShow.length && (
        <p className="text-xs text-slate-400 mt-2">
          + {level.skills.length - skillsToShow.length} more concept
          {level.skills.length - skillsToShow.length === 1 ? "" : "s"} in this level
        </p>
      )}
    </div>
  );
}
