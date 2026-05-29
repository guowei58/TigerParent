import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { StudentOnboardingGate } from "@/components/StudentOnboardingGate";
import { PopQuizGate } from "@/components/PopQuizGate";
import { StudentDeskBackground } from "@/components/layouts/StudentDeskBackground";
import { StudentChatProvider } from "@/components/chat/StudentChatContext";
import { StudentChatPanel } from "@/components/chat/StudentChatPanel";
import { getPendingPopQuiz } from "@/lib/pop-quiz";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.studentProfileId) redirect("/login");

  const studentId = session.user.studentProfileId;
  const [settings, pendingPopQuiz] = await Promise.all([
    prisma.studentSettings.findUnique({
      where: { studentId },
      select: { onboardingCompleted: true },
    }),
    getPendingPopQuiz(studentId),
  ]);

  const onboardingCompleted = settings?.onboardingCompleted ?? true;

  return (
    <StudentDeskBackground>
      <StudentOnboardingGate onboardingCompleted={onboardingCompleted}>
        <PopQuizGate
          pendingPopQuiz={
            pendingPopQuiz
              ? { id: pendingPopQuiz.id, sessionId: pendingPopQuiz.sessionId }
              : null
          }
        >
          <StudentChatProvider enabled={onboardingCompleted}>
            {children}
            <StudentChatPanel />
          </StudentChatProvider>
        </PopQuizGate>
      </StudentOnboardingGate>
    </StudentDeskBackground>
  );
}
