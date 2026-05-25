import { auth } from "@/lib/auth";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

import { getStudentByUserId, getLevelMap } from "@/lib/student";

import { getActiveSubjectId } from "@/lib/student-subject";

import { StudentNav } from "@/components/layouts/StudentNav";

import { ScrollToLevelsTarget } from "@/components/ScrollToCurrentUnit";

import { Card, CardTitle } from "@/components/ui/Card";

import { Badge } from "@/components/ui/Badge";

import { Button } from "@/components/ui/Button";

import Link from "next/link";



export default async function LevelsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const params = await searchParams;
  const student = await getStudentByUserId(session.user.id);
  const activeSubjectId = await getActiveSubjectId(session.user.studentProfileId);

  const subjects = await prisma.subject.findMany({
    where: {
      studentSubjects: {
        some: { studentId: session.user.studentProfileId, enabled: true },
      },
    },
  });

  const focusedSubjectId =
    params.subjectId && subjects.some((s) => s.id === params.subjectId)
      ? params.subjectId
      : activeSubjectId;

  const maps = await Promise.all(
    subjects.map(async (s) => ({
      subject: s,
      levels: await getLevelMap(session.user.studentProfileId!, s.id),
    })),
  );

  const currentSkillId =
    !params.subjectId
      ? maps
          .find((m) => m.subject.id === activeSubjectId)
          ?.levels.flatMap((l) => l.skills)
          .find((s) => s.isCurrent)?.id ?? null
      : null;

  return (
    <div className="min-h-[100dvh] pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={student!.displayName} />
      <ScrollToLevelsTarget
        subjectId={params.subjectId ?? null}
        skillId={currentSkillId}
      />

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-8">

        <Card>

          <CardTitle className="text-2xl">Lesson Plan 📚</CardTitle>

          <p className="text-slate-500 mt-1">

            Work through units in order at your own pace. Finish a unit, then move to the next.

          </p>

        </Card>



        {maps.map(({ subject, levels }) => (

          <div

            key={subject.id}

            id={`subject-${subject.id}`}

            className={
              subject.id === focusedSubjectId
                ? "rounded-2xl ring-2 ring-indigo-300 ring-offset-2 p-1"
                : ""
            }
          >
            <h2 className="text-xl font-bold text-indigo-700 mb-4">
              {subject.name}
              {subject.id === focusedSubjectId && params.subjectId && (
                <span className="ml-2 text-sm font-normal text-indigo-500">(viewing)</span>
              )}

            </h2>

            <div className="space-y-4">

              {levels.map((level) => (

                <Card key={level.id}>

                  <p className="font-semibold text-slate-700">

                    Grade {level.nominalGradeLevel}: {level.title}

                  </p>

                  <div className="mt-3 grid gap-2">

                    {level.skills.map((skill) => (

                      <div

                        key={skill.id}

                        id={`skill-${skill.id}`}

                        className={`rounded-xl p-3 ${

                          skill.isCurrent

                            ? "bg-indigo-100 border-2 border-indigo-300"

                            : skill.mastery?.status === "MASTERED"

                              ? "bg-emerald-50"

                              : "bg-slate-50"

                        }`}

                      >

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <span className="font-medium">{skill.title}</span>

                          <Badge

                            variant={
                              skill.statusLabel === "Mastered" ||
                              skill.statusLabel === "Unit complete"
                                ? "success"
                                : skill.isCurrent
                                  ? "info"
                                  : "default"
                            }
                          >
                            {skill.statusLabel}
                          </Badge>

                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">

                          <Link href={`/student/lesson/${skill.id}`}>

                            <Button size="sm" variant={skill.isCurrent ? "primary" : "secondary"}>

                              Lesson

                            </Button>

                          </Link>

                          <Link href={`/student/practice/new?skillId=${skill.id}`}>

                            <Button size="sm" variant="ghost">

                              Practice

                            </Button>

                          </Link>

                        </div>

                      </div>

                    ))}

                  </div>

                </Card>

              ))}

            </div>

          </div>

        ))}

      </main>

    </div>

  );

}

