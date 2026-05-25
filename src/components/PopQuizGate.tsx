"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

type PendingPopQuiz = {
  id: string;
  sessionId: string | null;
};

const ALWAYS_ALLOWED = ["/student/pop-quiz", "/student/settings"];

export function PopQuizGate({
  pendingPopQuiz,
  children,
}: {
  pendingPopQuiz: PendingPopQuiz | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pendingPopQuiz) return;

    if (ALWAYS_ALLOWED.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return;
    }

    if (
      pendingPopQuiz.sessionId &&
      pathname.startsWith(`/student/practice/${pendingPopQuiz.sessionId}`)
    ) {
      return;
    }

    router.replace("/student/pop-quiz");
  }, [pendingPopQuiz, pathname, router]);

  if (!pendingPopQuiz) return children;

  const allowed =
    ALWAYS_ALLOWED.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    (pendingPopQuiz.sessionId &&
      pathname.startsWith(`/student/practice/${pendingPopQuiz.sessionId}`));

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="rounded-2xl bg-white/90 px-4 py-2 text-slate-500 shadow-sm backdrop-blur-sm">
          Pop quiz waiting…
        </p>
      </div>
    );
  }

  return children;
}
