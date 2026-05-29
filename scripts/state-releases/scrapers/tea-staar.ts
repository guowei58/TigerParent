import type { ReleaseDownloadTarget, ReleaseSubject } from "../catalog";
import { fetchHtml, resolveUrl } from "./fetch-html";

const PAGE_URL =
  "https://tea.texas.gov/student-assessment/staar/staar-released-test-questions";
const PDF_BASE = "https://tea.texas.gov";

/** Scrape TEA STAAR page for all English PDF links (keys, tests, rationales). */
export async function scrapeTeaStaarTargets(): Promise<ReleaseDownloadTarget[]> {
  const html = await fetchHtml(PAGE_URL);
  const targets: ReleaseDownloadTarget[] = [];
  const seen = new Set<string>();

  const hrefRe = /href="(\/student-assessment\/staar\/released-test-questions\/[^"]+\.pdf)"/gi;
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null) {
    const path = m[1];
    if (path.includes("spanish")) continue;

    const url = resolveUrl(path, PDF_BASE);
    if (seen.has(url)) continue;
    seen.add(url);

    const parsed = parseStaarFilename(path);
    if (!parsed) continue;

    targets.push({
      stateCode: "TX",
      stateName: "Texas",
      sourceId: "tea-staar",
      year: parsed.year,
      grade: parsed.grade,
      subject: parsed.subject,
      url,
      localPath: `data/state-releases/TX/${parsed.year}/${parsed.subject}/g${parsed.grade}-${parsed.fname}`,
      importMode: "FULL",
    });
  }

  return targets;
}

function parseStaarFilename(path: string): {
  year: number;
  grade: number;
  subject: ReleaseSubject;
  fname: string;
} | null {
  const fname = path.split("/").pop()!;
  const lower = fname.toLowerCase();

  const yearMatch =
    lower.match(/(\d{4})-staar/) ??
    lower.match(/staar-(\d{4})/) ??
    lower.match(/^(\d{4})-/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : NaN;
  if (!year || year < 2015 || year > 2030) return null;

  let grade = 0;
  const gradePatterns = [
    /-(\d)-(?:math|rla|reading)/,
    /grade-(\d)/,
    /-g(\d)-/,
    /staar-(\d)-/,
    /math-(\d)-/,
    /rla-(\d)-/,
  ];
  for (const re of gradePatterns) {
    const gm = lower.match(re);
    if (gm) {
      grade = parseInt(gm[1], 10);
      break;
    }
  }
  if (grade < 3 || grade > 8) return null;

  const subject: ReleaseSubject =
    lower.includes("math") ? "math" : lower.includes("rla") || lower.includes("reading") || lower.includes("writing")
      ? "ela"
      : "math";

  // Skip writing-only keys when we already have reading for same grade/year
  if (lower.includes("writing") && !lower.includes("reading")) {
    // still keep writing rationales/keys for ELA enrichment
  }

  return { year, grade, subject, fname };
}
