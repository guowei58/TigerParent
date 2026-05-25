"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function StudentOnboardingGate({
  onboardingCompleted,
  children,
}: {
  onboardingCompleted: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onSettingsPage = pathname.startsWith("/student/settings");

  useEffect(() => {
    if (!onboardingCompleted && !onSettingsPage) {
      router.replace("/student/settings");
    }
  }, [onboardingCompleted, onSettingsPage, router]);

  if (!onboardingCompleted && !onSettingsPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="rounded-2xl bg-white/90 px-4 py-2 text-slate-500 shadow-sm backdrop-blur-sm">
          Loading…
        </p>
      </div>
    );
  }

  return children;
}
