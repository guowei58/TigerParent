"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SubjectTab = { id: string; name: string };

type StudentSubjectContextValue = {
  subjects: SubjectTab[];
  activeSubjectId: string | null;
  switchSubject: (subjectId: string) => Promise<void>;
  switching: boolean;
};

const StudentSubjectContext = createContext<StudentSubjectContextValue>({
  subjects: [],
  activeSubjectId: null,
  switchSubject: async () => {},
  switching: false,
});

export function StudentSubjectProvider({
  subjects,
  activeSubjectId,
  children,
}: {
  subjects: SubjectTab[];
  activeSubjectId: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const switchSubject = async (subjectId: string) => {
    if (!subjectId || subjectId === activeSubjectId || switching) return;
    setSwitching(true);
    await fetch("/api/student/active-subject", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId }),
    });
    router.refresh();
    setSwitching(false);
  };

  return (
    <StudentSubjectContext.Provider
      value={{ subjects, activeSubjectId, switchSubject, switching }}
    >
      {children}
    </StudentSubjectContext.Provider>
  );
}

export function useStudentSubjects() {
  return useContext(StudentSubjectContext);
}

export function StudentSubjectTabs({ compact = false }: { compact?: boolean }) {
  const { subjects, activeSubjectId, switchSubject, switching } =
    useStudentSubjects();

  if (subjects.length <= 1) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 gap-1 overflow-x-auto",
        !compact && "pb-2",
      )}
    >
      {subjects.map((subject) => {
        const active = subject.id === activeSubjectId;
        return (
          <button
            key={subject.id}
            type="button"
            disabled={switching}
            onClick={() => switchSubject(subject.id)}
            className={cn(
              "shrink-0 rounded-full font-semibold touch-manipulation transition",
              compact ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm",
              active
                ? "bg-white text-indigo-700 shadow-sm"
                : "bg-white/15 text-white hover:bg-white/25",
              switching && !active && "opacity-60",
            )}
          >
            {subject.name}
          </button>
        );
      })}
    </div>
  );
}
