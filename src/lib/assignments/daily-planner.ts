import type { AssignmentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { buildAssignmentProblems, assignmentDefaults } from "./builder";
import type { DailyWorkItem } from "./types";
import { ASSIGNMENT_TYPE_LABELS } from "./types";

const DAILY_SEQUENCE: {
  type: AssignmentType;
  title: string;
  description: string;
  priority: number;
}[] = [
  {
    type: "DRILL",
    title: "Warm-up Drill",
    description: "Quick fluency warm-up — timed repetition.",
    priority: 1,
  },
  {
    type: "HOMEWORK",
    title: "Homework Practice",
    description: "Focused practice on your current skill.",
    priority: 2,
  },
  {
    type: "QUIZ",
    title: "Timed Quiz",
    description: "Short timed check on current and recent skills.",
    priority: 3,
  },
  {
    type: "RETAKE",
    title: "Fix Mistakes",
    description: "Retake missed problems and learn from errors.",
    priority: 4,
  },
];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function ensureDailyAssignments(studentId: string, subjectId: string) {
  const [student, placement] = await Promise.all([
    prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      include: { settings: true },
    }),
    prisma.studentSubjectPlacement.findUnique({
      where: { studentId_subjectId: { studentId, subjectId } },
      include: { currentSkill: true },
    }),
  ]);

  const dayStart = startOfDay();
  const existing = await prisma.assignment.findMany({
    where: {
      studentId,
      subjectId,
      createdAt: { gte: dayStart },
      assignmentType: { in: DAILY_SEQUENCE.map((d) => d.type) },
    },
  });

  const existingTypes = new Set(existing.map((a) => a.assignmentType));
  const strictness = student.settings?.contentStrictness ?? "BALANCED_PRACTICE";
  const skillId = placement?.currentSkillId ?? undefined;
  const gradeLevel = placement?.schoolGrade ?? student.schoolGrade;

  const created = [];

  for (const item of DAILY_SEQUENCE) {
    if (existingTypes.has(item.type)) continue;

    const defaults = assignmentDefaults(item.type);
    const { problemIds, sourceMix } = await buildAssignmentProblems({
      studentId,
      assignmentType: item.type,
      subjectId,
      skillId,
      gradeLevel,
      count: defaults.count,
      strictness,
    });

    if (!problemIds.length && item.type === "RETAKE") continue;

    const assignment = await prisma.assignment.create({
      data: {
        studentId,
        assignmentType: item.type,
        title: item.title,
        subjectId,
        gradeLevel,
        skillIdsJson: skillId ? [skillId] : [],
        problemIdsJson: problemIds,
        targetMinutes: defaults.minutes,
        timed: defaults.timed,
        timeLimitSeconds: defaults.timeLimitSeconds,
        sourceMixJson: sourceMix,
        dueDate: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    created.push(assignment);
  }

  // Saturday challenge
  const isSaturday = new Date().getDay() === 6;
  if (isSaturday && !existing.some((a) => a.assignmentType === "CHALLENGE")) {
    const defaults = assignmentDefaults("CHALLENGE");
    const { problemIds, sourceMix } = await buildAssignmentProblems({
      studentId,
      assignmentType: "CHALLENGE",
      subjectId,
      skillId,
      gradeLevel,
      count: defaults.count,
      strictness,
    });
    if (problemIds.length) {
      created.push(
        await prisma.assignment.create({
          data: {
            studentId,
            assignmentType: "CHALLENGE",
            title: "Weekend Challenge",
            subjectId,
            gradeLevel,
            skillIdsJson: skillId ? [skillId] : [],
            problemIdsJson: problemIds,
            targetMinutes: defaults.minutes,
            sourceMixJson: sourceMix,
          },
        }),
      );
    }
  }

  return [...existing, ...created];
}

export async function getStudentWorkQueue(studentId: string, subjectId?: string) {
  const settings = await prisma.studentSettings.findUnique({ where: { studentId } });
  const activeSubjectId =
    subjectId ??
    settings?.activeSubjectId ??
    (await prisma.subject.findFirst({ orderBy: { name: "asc" } }))?.id;

  if (!activeSubjectId) return { items: [] as DailyWorkItem[], subjectId: null };

  const assignments = await ensureDailyAssignments(studentId, activeSubjectId);

  const items: DailyWorkItem[] = assignments
    .sort((a, b) => {
      const pa = DAILY_SEQUENCE.find((d) => d.type === a.assignmentType)?.priority ?? 99;
      const pb = DAILY_SEQUENCE.find((d) => d.type === b.assignmentType)?.priority ?? 99;
      return pa - pb;
    })
    .map((assignment) => {
      const meta = DAILY_SEQUENCE.find((d) => d.type === assignment.assignmentType);
      const route =
        assignment.assignmentType === "DRILL"
          ? "/student/drills"
          : assignment.assignmentType === "HOMEWORK"
            ? "/student/homework"
            : assignment.assignmentType === "QUIZ"
              ? "/student/tests"
              : assignment.assignmentType === "RETAKE"
                ? "/student/retake"
                : assignment.assignmentType === "BENCHMARK"
                  ? "/student/benchmarks"
                  : assignment.assignmentType === "CHALLENGE"
                    ? "/student/challenge"
                    : "/student/today";

      return {
        assignment,
        label: meta?.title ?? ASSIGNMENT_TYPE_LABELS[assignment.assignmentType],
        description: meta?.description ?? "",
        estimatedMinutes: assignment.targetMinutes,
        href: `${route}?assignmentId=${assignment.id}`,
        priority: meta?.priority ?? 99,
      };
    });

  return { items, subjectId: activeSubjectId };
}

export async function getAssignmentsByType(
  studentId: string,
  types: AssignmentType[],
  limit = 20,
) {
  return prisma.assignment.findMany({
    where: { studentId, assignmentType: { in: types } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
