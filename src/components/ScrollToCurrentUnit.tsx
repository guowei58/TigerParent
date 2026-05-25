"use client";

import { useEffect } from "react";

export function ScrollToLevelsTarget({
  subjectId,
  skillId,
}: {
  subjectId: string | null;
  skillId: string | null;
}) {
  useEffect(() => {
    if (subjectId) {
      const el = document.getElementById(`subject-${subjectId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (skillId) {
      const el = document.getElementById(`skill-${skillId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [subjectId, skillId]);

  return null;
}

/** @deprecated Use ScrollToLevelsTarget */
export function ScrollToCurrentUnit({ skillId }: { skillId: string | null }) {
  return <ScrollToLevelsTarget subjectId={null} skillId={skillId} />;
}
