/** Legacy numeric skill ids (math-g6-0) superseded by slug ids (math-g6-ratios). */
const LEGACY_NUMERIC_ID = /^[a-z]+-g\d+-\d+$/;

/** Map retired legacy skill ids to canonical curriculum skill ids. */
export const LEGACY_SKILL_REDIRECT: Record<string, string> = {
  "math-g6-0": "math-g6-ratios",
  "math-g6-1": "math-g6-unit-rates",
  "math-g6-2": "math-g6-percent-of-a-number",
  "math-g6-3": "math-g6-integer-addition-subtraction",
  "math-g6-4": "math-g6-evaluate-expressions",
  "math-g6-5": "math-g6-one-step-equations",
  "math-g6-6": "math-g6-mean-median-mode",
};

export function isLegacySkillId(id: string): boolean {
  return LEGACY_NUMERIC_ID.test(id);
}

export function canonicalSkillId(id: string): string {
  return LEGACY_SKILL_REDIRECT[id] ?? id;
}

export function legacySkillIdsForCanonical(canonicalId: string): string[] {
  return Object.entries(LEGACY_SKILL_REDIRECT)
    .filter(([, target]) => target === canonicalId)
    .map(([legacy]) => legacy);
}

export function filterVisibleSkills<
  T extends { id: string; title: string; sequence: number },
>(skills: T[]): T[] {
  const canonicalTitles = new Set(
    skills.filter((s) => !isLegacySkillId(s.id)).map((s) => s.title),
  );

  return skills
    .filter((s) => {
      if (!isLegacySkillId(s.id)) return true;
      if (LEGACY_SKILL_REDIRECT[s.id]) return false;
      return !canonicalTitles.has(s.title);
    })
    .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}

export function unitStatusLabel(input: {
  isCurrent: boolean;
  masteryStatus: string | null | undefined;
  unitPracticeComplete: boolean;
  hasStarted: boolean;
}): string {
  if (input.masteryStatus === "MASTERED") return "Mastered";
  if (input.isCurrent) return "Current unit";
  if (input.unitPracticeComplete) return "Unit complete";
  if (input.hasStarted) return "In progress";
  return "Upcoming";
}
