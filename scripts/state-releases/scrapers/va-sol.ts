import type { ReleaseDownloadTarget, ReleaseSubject } from "../catalog";
import { fetchHtml, resolveUrl } from "./fetch-html";

const PAGE_URL =
  "https://www.doe.virginia.gov/teaching-learning-assessment/student-assessment/sol-practice-items-all-subjects/released-tests-item-sets-all-subjects";

/** Known VDOE PDF patterns when index scrape is blocked. */
const FALLBACK_PATTERNS: Array<{
  year: number;
  grade: number;
  subject: ReleaseSubject;
  path: string;
}> = [];

for (const year of [2014, 2015]) {
  for (let grade = 3; grade <= 8; grade++) {
    FALLBACK_PATTERNS.push({
      year,
      grade,
      subject: "math",
      path: `https://www.doe.virginia.gov/testing/sol/released_tests/${year}/math_${grade}.pdf`,
    });
    FALLBACK_PATTERNS.push({
      year,
      grade,
      subject: "ela",
      path: `https://www.doe.virginia.gov/testing/sol/released_tests/${year}/reading_${grade}.pdf`,
    });
    // Alternate naming used on newer mirrors
    FALLBACK_PATTERNS.push({
      year,
      grade,
      subject: "math",
      path: `https://www.doe.virginia.gov/testing/sol/released_tests/${year}/sol_math_grade${grade}_${year}.pdf`,
    });
    FALLBACK_PATTERNS.push({
      year,
      grade,
      subject: "ela",
      path: `https://www.doe.virginia.gov/testing/sol/released_tests/${year}/sol_reading_grade${grade}_${year}.pdf`,
    });
  }
}

export async function scrapeVaSolTargets(): Promise<ReleaseDownloadTarget[]> {
  const targets: ReleaseDownloadTarget[] = [];
  const seen = new Set<string>();

  try {
    const html = await fetchHtml(PAGE_URL);
    const re = /href="([^"]+\.pdf)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const url = resolveUrl(m[1], PAGE_URL);
      const parsed = parseVaUrl(url);
      if (!parsed || seen.has(url)) continue;
      seen.add(url);
      targets.push(makeTarget(url, parsed.year, parsed.grade, parsed.subject));
    }
  } catch (e) {
    console.warn("  VA index scrape failed, using fallback URL patterns:", (e as Error).message);
  }

  for (const fb of FALLBACK_PATTERNS) {
    if (seen.has(fb.path)) continue;
    targets.push(makeTarget(fb.path, fb.year, fb.grade, fb.subject));
  }

  return targets;
}

function makeTarget(
  url: string,
  year: number,
  grade: number,
  subject: ReleaseSubject,
): ReleaseDownloadTarget {
  const fname = url.split("/").pop()!;
  return {
    stateCode: "VA",
    stateName: "Virginia",
    sourceId: "va-sol-released",
    year,
    grade,
    subject,
    url,
    localPath: `data/state-releases/VA/${year}/${subject}/g${grade}-${fname}`,
    importMode: "FULL",
  };
}

function parseVaUrl(url: string): { year: number; grade: number; subject: ReleaseSubject } | null {
  const lower = url.toLowerCase();
  const yearMatch = lower.match(/20(14|15)/);
  if (!yearMatch) return null;
  const year = parseInt(`20${yearMatch[1]}`, 10);

  const gradeMatch = lower.match(/grade[_\s-]?(\d)|[_\s-](\d)\.pdf|math_(\d)|reading_(\d)/);
  const grade = gradeMatch
    ? parseInt(gradeMatch[1] ?? gradeMatch[2] ?? gradeMatch[3] ?? gradeMatch[4], 10)
    : NaN;
  if (grade < 3 || grade > 8) return null;

  const subject: ReleaseSubject = lower.includes("reading") ? "ela" : "math";
  return { year, grade, subject };
}
