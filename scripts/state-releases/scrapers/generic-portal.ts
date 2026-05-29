import type { ReleaseDownloadTarget, StateSourceDef } from "../catalog";
import { fetchHtml, resolveUrl } from "./fetch-html";

const PDF_KEYWORDS =
  /released|practice|item|test|eog|eoc|leap|staar|mcas|sol|pssa|milestones|ostp|ost|assessment|answer.?key|rationale/i;

/** Crawl a state assessment portal page for downloadable PDFs. */
export async function scrapePortalPdfs(
  source: StateSourceDef,
  options?: { maxLinks?: number },
): Promise<ReleaseDownloadTarget[]> {
  const max = options?.maxLinks ?? 80;
  const targets: ReleaseDownloadTarget[] = [];
  const seen = new Set<string>();

  let html: string;
  try {
    html = await fetchHtml(source.portalUrl);
  } catch {
    return [];
  }

  const hrefRe = /href=["']([^"']+\.pdf[^"']*)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null && targets.length < max) {
    const href = m[1];
    if (!PDF_KEYWORDS.test(href) && !PDF_KEYWORDS.test(decodeURIComponent(href))) continue;

    const url = resolveUrl(href, source.portalUrl);
    if (seen.has(url)) continue;
    seen.add(url);

    const parsed = inferFromUrl(url, source);
    if (!parsed) continue;

    const fname = url.split("/").pop() ?? "doc.pdf";
    targets.push({
      stateCode: source.stateCode,
      stateName: source.stateCode,
      sourceId: source.id,
      year: parsed.year,
      grade: parsed.grade,
      subject: parsed.subject,
      url,
      localPath: `data/state-releases/${source.stateCode}/portal/${parsed.year}/${parsed.subject}/${fname}`,
      importMode: source.importMode,
    });
  }

  return targets;
}

function inferFromUrl(
  url: string,
  source: StateSourceDef,
): { year: number; grade: number; subject: "math" | "ela" } | null {
  const lower = url.toLowerCase();
  const yearMatch = lower.match(/20(1[5-9]|2[0-5])/);
  const year = yearMatch ? parseInt(`20${yearMatch[1]}`, 10) : source.yearRange[1];

  const gradeMatch =
    lower.match(/grade[_\s-]?(\d)/) ??
    lower.match(/g(\d)[^0-9]/) ??
    lower.match(/-(\d)-(?:math|ela|reading|rla)/);
  let grade = gradeMatch ? parseInt(gradeMatch[1], 10) : 5;
  if (grade < source.gradeRange[0] || grade > source.gradeRange[1]) grade = 5;

  const subject: "math" | "ela" =
    /math|algebra|geometry/.test(lower) && !/reading|ela|rla|english|writing/.test(lower)
      ? "math"
      : /reading|ela|rla|english|writing/.test(lower)
        ? "ela"
        : source.subjects[0];

  return { year, grade, subject };
}

export async function scrapeAllPortalStates(
  sources: StateSourceDef[],
): Promise<ReleaseDownloadTarget[]> {
  const results: ReleaseDownloadTarget[] = [];
  const linkOnly = sources.filter((s) => s.importMode === "LINK_ONLY");

  for (const source of linkOnly) {
    try {
      const found = await scrapePortalPdfs(source, { maxLinks: 40 });
      if (found.length) {
        console.log(`    ${source.stateCode} ${source.shortName}: ${found.length} PDFs`);
        results.push(...found);
      }
    } catch {
      // skip blocked portals
    }
  }

  return results;
}
