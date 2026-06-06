export type PracticeTopicItem = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  gradeLevel: number;
  totalCount: number;
  doneCount: number;
  leftCount: number;
};

export type PracticePassageItem = {
  id: string;
  passageNumber: number;
  title: string;
  subtitle: string | null;
  gradeLevel: number;
  totalCount: number;
  doneCount: number;
  leftCount: number;
};

export type PracticeSubjectGroup = {
  subject: string;
  label: string;
  domains: { domain: string; topics: PracticeTopicItem[] }[];
  /** ELA reading sets — one entry per shared passage, not skill/concept. */
  passages?: PracticePassageItem[];
};

export type PracticeGradeGroup = {
  gradeLevel: number;
  label: string;
  subjects: PracticeSubjectGroup[];
};

export function formatPracticeSubjectLabel(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("english") || s.includes("ela") || s.includes("reading")) return "English";
  if (s.includes("math")) return "Math";
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}
