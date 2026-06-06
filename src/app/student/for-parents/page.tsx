import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentByUserId } from "@/lib/student";
import { getStudentActiveDates, getStudentDailyWork } from "@/lib/analytics";
import { getPassageRecordingsForDay, getPassageRecordingsForPassageIds } from "@/lib/passage-recording.server";
import { prisma } from "@/lib/db";
import { StudentNav } from "@/components/layouts/StudentNav";
import {
  ParentLegacyAttemptCard,
  ParentPdfAttemptCard,
} from "@/components/ParentPdfAttemptCard";
import { ParentPassageRecordingCard } from "@/components/ParentPassageRecordingCard";
import { gradeLabel, parseLocalDateKey, todayDateKey } from "@/lib/utils";
import { DateDropdown } from "./DateDropdown";

export default async function ForParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const student = await getStudentByUserId(session.user.id);
  if (!student) redirect("/login");

  const { date: dateParam } = await searchParams;
  const selectedDate = dateParam ?? todayDateKey();
  const studentId = session.user.studentProfileId;

  const dayStart = parseLocalDateKey(selectedDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [dailyWork, activeDates, profile, passageRecordings] = await Promise.all([
    getStudentDailyWork(studentId, selectedDate),
    getStudentActiveDates(studentId),
    prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentId },
      select: { displayName: true, schoolGrade: true },
    }),
    getPassageRecordingsForDay(studentId, dayStart, dayEnd),
  ]);

  const attemptPassageIds = [
    ...new Set(
      dailyWork.pdfAttempts
        .map((a) => a.passageId)
        .filter((id): id is string => id != null),
    ),
  ];
  const passageRecordingsByPassageId = new Map(
    (
      await getPassageRecordingsForPassageIds(studentId, attemptPassageIds)
    ).map((r) => [r.passageId, r]),
  );
  const orphanPassageRecordings = passageRecordings.filter(
    (r) => !attemptPassageIds.includes(r.passageId),
  );

  const hasWork =
    dailyWork.pdfAttempts.length > 0 ||
    dailyWork.attempts.length > 0 ||
    passageRecordings.length > 0;

  return (
    <div className="pb-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StudentNav displayName={profile.displayName} />
      <main className="mx-auto max-w-3xl px-4 py-4 space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">
            Review Your Kid&apos;s Work
          </h1>
          <p className="mt-1 text-slate-600">
            {profile.displayName} · {gradeLabel(profile.schoolGrade)}
          </p>
        </header>

        <DateDropdown currentDate={selectedDate} activeDates={activeDates} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Done</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {dailyWork.problemsAttempted}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Correct</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
              {dailyWork.problemsCorrect}
            </p>
          </div>
        </div>

        {!hasWork ? (
          <p className="rounded-2xl bg-white/90 px-5 py-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/80">
            No practice on this date.
          </p>
        ) : (
          <div className="space-y-4">
            {dailyWork.pdfAttempts.map((attempt) => (
              <ParentPdfAttemptCard
                key={attempt.id}
                attempt={attempt}
                passageRecording={
                  attempt.passageId
                    ? (passageRecordingsByPassageId.get(attempt.passageId) ?? null)
                    : undefined
                }
              />
            ))}
            {dailyWork.attempts.map((attempt) => (
              <ParentLegacyAttemptCard key={attempt.id} attempt={attempt} />
            ))}
            {orphanPassageRecordings.map((recording) => (
              <ParentPassageRecordingCard key={recording.id} recording={recording} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
