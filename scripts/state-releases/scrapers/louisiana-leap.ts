import type { ReleaseDownloadTarget } from "../catalog";
import { fetchHtml, resolveUrl } from "./fetch-html";

const PRACTICE_URL = "https://www.louisianabelieves.com/resources/library/practice-tests";
const BASE = "https://www.louisianabelieves.com";

/** Louisiana LEAP practice test PDFs (public, grades 3–8 math + ELA). */
export async function scrapeLouisianaLeapTargets(): Promise<ReleaseDownloadTarget[]> {
  const html = await fetchHtml(PRACTICE_URL);
  const targets: ReleaseDownloadTarget[] = [];
  const seen = new Set<string>();

  const re = /href=["']([^"']+\.pdf[^"']*)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const lower = href.toLowerCase();
    if (!/practice|answer.?key|released|assessment/i.test(lower)) continue;
    if (/connect|science|biology|social/i.test(lower) && !/math|ela|english/.test(lower)) continue;

    const url = resolveUrl(href, BASE);
    if (seen.has(url)) continue;
    seen.add(url);

    const gradeMatch =
      lower.match(/grade[_\s-]?(\d)/) ?? lower.match(/english[_\s-]?([i]{1,2})/);
    let grade = 5;
    if (gradeMatch) {
      if (gradeMatch[1] === "i") grade = 9;
      else if (gradeMatch[1] === "ii" || gradeMatch[0]?.includes("ii")) grade = 10;
      else grade = parseInt(gradeMatch[1], 10);
    }
    if (grade < 3 || grade > 10) continue;

    const subject: "math" | "ela" = /math/.test(lower) ? "math" : "ela";
    const yearMatch = lower.match(/20(2[0-5])/);
    const year = yearMatch ? parseInt(`20${yearMatch[1]}`, 10) : 2025;

    const fname = url.split("/").pop()!.slice(0, 120);
    targets.push({
      stateCode: "LA",
      stateName: "Louisiana",
      sourceId: "la-leap-released",
      year,
      grade: Math.min(grade, 8),
      subject,
      url,
      localPath: `data/state-releases/LA/${year}/${subject}/${fname}`,
      importMode: "FULL",
    });
  }

  return targets;
}
