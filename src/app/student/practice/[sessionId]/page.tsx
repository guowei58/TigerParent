import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStudentByUserId } from "@/lib/student";
import { StudentNav } from "@/components/layouts/StudentNav";
import {
  loadProblemsByIds,
  selectFreshProblemsForStudent,
} from "@/lib/problem-selection";
import {
  getNextSkillInPlan,
  getOrCreateSkillPracticeSession,
} from "@/lib/unit-learning";
import { getPendingPopQuiz } from "@/lib/pop-quiz";
import { PracticeClient } from "./PracticeClient";

type PhaseJson = {
  primarySkillId?: string;
  skillIds?: string[];
  questionIds?: string[];
  popQuizAssignmentId?: string;
};

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ skillId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const { sessionId } = await params;
  const { skillId } = await searchParams;
  const student = await getStudentByUserId(session.user.id);
  const studentId = session.user.studentProfileId;

  const pendingPopQuiz = await getPendingPopQuiz(studentId);

  if (sessionId === "new" && skillId) {
    if (pendingPopQuiz) redirect("/student/pop-quiz");
    const sessionRecord = await getOrCreateSkillPracticeSession(studentId, skillId);
    redirect(`/student/practice/${sessionRecord.id}`);
  }

  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: {
      attempts: { select: { problemId: true } },
      assignment: true,
    },
  });

  if (!practiceSession || practiceSession.studentId !== studentId) {
    redirect("/student");
  }

  const isPopQuiz = practiceSession.sessionType === "POP_QUIZ";

  if (pendingPopQuiz && !isPopQuiz) {
    redirect("/student/pop-quiz");
  }

  if (isPopQuiz && pendingPopQuiz?.sessionId && pendingPopQuiz.sessionId !== sessionId) {
    redirect("/student/pop-quiz");
  }

  const phaseData = (practiceSession.phaseJson ?? {}) as PhaseJson;
  let finalProblems = phaseData.questionIds?.length
    ? await loadProblemsByIds(phaseData.questionIds)
    : [];

  if (practiceSession.assignment?.problemIdsJson) {
    const ids = practiceSession.assignment.problemIdsJson as string[];
    finalProblems = await loadProblemsByIds(ids);
    if (finalProblems.length) {
      await prisma.practiceSession.update({
        where: { id: practiceSession.id },
        data: {
          phaseJson: { ...phaseData, questionIds: finalProblems.map((p) => p.id) },
        },
      });
    }
  }

  const resolvedSkillId = skillId ?? phaseData.primarySkillId;
  const skillIds = phaseData.skillIds;

  const staleSession =
    phaseData.questionIds?.length &&
    finalProblems.length < phaseData.questionIds.length;

  if (!finalProblems.length || staleSession) {
    if (isPopQuiz && skillIds?.length) {
      finalProblems = await selectFreshProblemsForStudent({
        studentId,
        skillIds,
        count: phaseData.questionIds?.length || 8,
        sessionId: practiceSession.id,
        sessionType: "POP_QUIZ",
        recordExposure: true,
      });
    } else if (resolvedSkillId) {
      finalProblems = await selectFreshProblemsForStudent({
        studentId,
        skillId: resolvedSkillId,
        count: 10,
        sessionId: practiceSession.id,
        recordExposure: true,
      });
    }

    if (finalProblems.length) {
      await prisma.practiceSession.update({
        where: { id: practiceSession.id },
        data: {
          phaseJson: {
            ...phaseData,
            primarySkillId: resolvedSkillId,
            questionIds: finalProblems.map((p) => p.id),
          },
        },
      });
    }
  }

  const attemptedIds = new Set(practiceSession.attempts.map((a) => a.problemId));
  const initialProblemIndex = finalProblems.findIndex((p) => !attemptedIds.has(p.id));
  const unitAlreadyComplete = finalProblems.length > 0 && initialProblemIndex === -1;
  const resumeIndex = initialProblemIndex >= 0 ? initialProblemIndex : 0;

  let skillTitle: string | undefined;
  if (practiceSession.assignment) {
    skillTitle = practiceSession.assignment.title;
  } else if (isPopQuiz) {
    const titles = skillIds?.length
      ? (
          await prisma.skill.findMany({
            where: { id: { in: skillIds } },
            select: { title: true },
          })
        ).map((s) => s.title)
      : [];
    skillTitle = titles.length ? `Pop Quiz — ${titles.join(", ")}` : "Pop Quiz";
  } else if (resolvedSkillId) {
    const skill = await prisma.skill.findUnique({
      where: { id: resolvedSkillId },
      select: { title: true },
    });
    skillTitle = skill?.title;
  }

  const nextSkill =
    !isPopQuiz && resolvedSkillId ? await getNextSkillInPlan(resolvedSkillId) : null;

  return (
    <div className="min-h-[100dvh] pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student!.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-3 md:py-4">
        <PracticeClient
          sessionId={sessionId}
          problems={finalProblems}
          skillId={resolvedSkillId}
          skillTitle={skillTitle}
          initialProblemIndex={resumeIndex}
          unitAlreadyComplete={unitAlreadyComplete}
          nextUnit={nextSkill ? { id: nextSkill.id, title: nextSkill.title } : null}
          isPopQuiz={isPopQuiz}
        />
      </main>
    </div>
  );
}
