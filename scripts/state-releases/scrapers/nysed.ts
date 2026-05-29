import type { ReleaseDownloadTarget } from "../catalog";
import { fetchHtml, resolveUrl } from "./fetch-html";

const BASE = "https://www.nysedregents.org/ei/";

/** Scrape NYSED index pages for all released-items PDFs (2016–2025). */
export async function scrapeNysedTargets(): Promise<ReleaseDownloadTarget[]> {
  const targets: ReleaseDownloadTarget[] = [];

  for (const subject of ["math", "ela"] as const) {
    const indexUrl = `${BASE}ei-${subject}.html`;
    const html = await fetchHtml(indexUrl);
    const re = new RegExp(
      `(?:${subject}/\\d{4}/(?:english/)?\\d{4}-released-items-${subject}-g\\d+\\.pdf)`,
      "gi",
    );
    const paths = [...new Set(html.match(re) ?? [])];

    for (const relPath of paths) {
      const url = resolveUrl(relPath, BASE);
      const yearMatch = relPath.match(/\/(\d{4})\//);
      const gradeMatch = relPath.match(/g(\d+)\.pdf/i);
      if (!yearMatch || !gradeMatch) continue;

      const year = parseInt(yearMatch[1], 10);
      const grade = parseInt(gradeMatch[1], 10);
      if (grade < 3 || grade > 8) continue;

      const slug = relPath.replace(/\//g, "_");
      targets.push({
        stateCode: "NY",
        stateName: "New York",
        sourceId: "nysed-released",
        year,
        grade,
        subject,
        url,
        localPath: `data/state-releases/NY/${year}/${subject}/${slug}`,
        importMode: "FULL",
      });
    }
  }

  return targets;
}
