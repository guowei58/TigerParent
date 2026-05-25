import { prisma } from "./db";
import { getLevelMap } from "./student";
import { getStudentSubjectOptions } from "./student-subject";

export type RoadmapSkillPhase = "past" | "current" | "future";

export type RoadmapSkill = {
  id: string;
  title: string;
  description: string | null;
  phase: RoadmapSkillPhase;
  mastered: boolean;
  masteryScore: number | null;
  status: string | null;
};

export type RoadmapLevelPhase = "past" | "current" | "future";

export type RoadmapLevel = {
  id: string;
  title: string;
  nominalGradeLevel: number;
  sequence: number;
  phase: RoadmapLevelPhase;
  masteredCount: number;
  totalSkills: number;
  skills: RoadmapSkill[];
  isSchoolGrade: boolean;
  isTargetGrade: boolean;
};

export type SubjectRoadmap = {
  subjectId: string;
  subjectName: string;
  schoolGrade: number;
  assessedGradeLevel: number;
  monthsAheadOrBehind: number;
  targetAheadMonths: number;
  targetGradeLevel: number;
  onTrack: boolean;
  currentSkillTitle: string | null;
  currentLevelTitle: string | null;
  totalMastered: number;
  totalSkills: number;
  levels: RoadmapLevel[];
  upcomingLevels: RoadmapLevel[];
};

export type CurriculumRoadmapData = {
  schoolGrade: number;
  targetAheadMonths: number;
  subjects: SubjectRoadmap[];
};

function skillSortKey(levelSequence: number, skillSequence: number) {
  return levelSequence * 1000 + skillSequence;
}

function skillHasAppActivity(skill: {
  mastery?: { attemptsCount: number; status: string } | null;
}) {
  if (!skill.mastery) return false;
  return skill.mastery.attemptsCount > 0 || skill.mastery.status === "MASTERED";
}

function levelHasAppActivity(
  skills: Awaited<ReturnType<typeof getLevelMap>>[number]["skills"],
) {
  return skills.some((skill) => skillHasAppActivity(skill));
}

function findCurrentPosition(
  levels: Awaited<ReturnType<typeof getLevelMap>>,
  currentSkillId: string | null | undefined,
) {
  if (!currentSkillId) return null;

  for (const level of levels) {
    for (const skill of level.skills) {
      if (skill.id === currentSkillId) {
        return {
          levelId: level.id,
          levelSequence: level.sequence,
          skillSequence: skill.sequence,
          sortKey: skillSortKey(level.sequence, skill.sequence),
        };
      }
    }
  }
  return null;
}

function buildSubjectRoadmap(
  subject: { id: string; name: string },
  levels: Awaited<ReturnType<typeof getLevelMap>>,
  placement: {
    schoolGrade: number;
    assessedGradeLevel: number;
    monthsAheadOrBehind: number;
    currentSkillId: string | null;
    currentLevelId: string | null;
  } | undefined,
  schoolGrade: number,
  targetAheadMonths: number,
): SubjectRoadmap {
  const current = findCurrentPosition(levels, placement?.currentSkillId);
  const targetGradeLevel = Math.min(
    schoolGrade + targetAheadMonths,
    levels[levels.length - 1]?.nominalGradeLevel ?? schoolGrade + targetAheadMonths,
  );
  const monthsAheadOrBehind = placement?.monthsAheadOrBehind ?? 0;
  const assessedGradeLevel = placement?.assessedGradeLevel ?? schoolGrade;

  let totalMastered = 0;
  let totalSkills = 0;

  const roadmapLevels: RoadmapLevel[] = levels.map((level) => {
    const masteredCount = level.skills.filter(
      (s) => s.mastery?.status === "MASTERED",
    ).length;
    totalMastered += masteredCount;
    totalSkills += level.skills.length;

    let levelPhase: RoadmapLevelPhase = "future";
    if (current) {
      if (level.id === current.levelId) {
        levelPhase = "current";
      } else if (
        level.sequence < current.levelSequence &&
        levelHasAppActivity(level.skills)
      ) {
        levelPhase = "past";
      } else {
        levelPhase = "future";
      }
    } else if (
      levelHasAppActivity(level.skills) &&
      masteredCount === level.skills.length
    ) {
      levelPhase = "past";
    } else if (levelHasAppActivity(level.skills)) {
      levelPhase = "current";
    }

    const skills: RoadmapSkill[] = level.skills.map((skill) => {
      const sortKey = skillSortKey(level.sequence, skill.sequence);
      let phase: RoadmapSkillPhase = "future";

      if (skill.isCurrent) {
        phase = "current";
      } else if (skill.mastery?.status === "MASTERED") {
        phase = "past";
      } else if (skillHasAppActivity(skill)) {
        phase = "past";
      } else if (current && sortKey > current.sortKey) {
        phase = "future";
      }

      return {
        id: skill.id,
        title: skill.title,
        description: skill.description,
        phase,
        mastered: skill.mastery?.status === "MASTERED",
        masteryScore: skill.mastery?.masteryScore ?? null,
        status: skill.mastery?.status ?? null,
      };
    });

    return {
      id: level.id,
      title: level.title,
      nominalGradeLevel: level.nominalGradeLevel,
      sequence: level.sequence,
      phase: levelPhase,
      masteredCount,
      totalSkills: level.skills.length,
      skills,
      isSchoolGrade: level.nominalGradeLevel === schoolGrade,
      isTargetGrade: level.nominalGradeLevel === targetGradeLevel,
    };
  });

  const currentLevel = current
    ? roadmapLevels.find((l) => l.id === current.levelId)
    : roadmapLevels.find((l) => l.phase === "current");

  const currentSkill = currentLevel?.skills.find((s) => s.phase === "current");

  const upcomingLevels = current
    ? roadmapLevels.filter((l) => l.sequence > current.levelSequence)
    : roadmapLevels.filter(
        (l) =>
          l.phase === "future" &&
          l.nominalGradeLevel > (placement?.assessedGradeLevel ?? schoolGrade),
      );

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    schoolGrade,
    assessedGradeLevel,
    monthsAheadOrBehind,
    targetAheadMonths,
    targetGradeLevel,
    onTrack: monthsAheadOrBehind >= targetAheadMonths,
    currentSkillTitle: currentSkill?.title ?? null,
    currentLevelTitle: currentLevel?.title ?? null,
    totalMastered,
    totalSkills,
    levels: roadmapLevels,
    upcomingLevels,
  };
}

export async function getCurriculumRoadmaps(
  studentId: string,
): Promise<CurriculumRoadmapData> {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: { schoolGrade: true, targetAheadMonths: true },
  });

  const [subjects, placements] = await Promise.all([
    getStudentSubjectOptions(studentId),
    prisma.studentSubjectPlacement.findMany({ where: { studentId } }),
  ]);

  const placementMap = new Map(placements.map((p) => [p.subjectId, p]));

  const subjectRoadmaps = await Promise.all(
    subjects.map(async (subject) => {
      const levels = await getLevelMap(studentId, subject.id);
      const placement = placementMap.get(subject.id);
      return buildSubjectRoadmap(
        subject,
        levels,
        placement,
        student.schoolGrade,
        student.targetAheadMonths,
      );
    }),
  );

  return {
    schoolGrade: student.schoolGrade,
    targetAheadMonths: student.targetAheadMonths,
    subjects: subjectRoadmaps,
  };
}
