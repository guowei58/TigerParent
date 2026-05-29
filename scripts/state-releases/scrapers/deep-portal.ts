import type { ReleaseDownloadTarget, StateSourceDef } from "../catalog";
import { STATE_RELEASE_PAGES } from "../state-release-urls";
import { fetchHtml, resolveUrl } from "./fetch-html";
import { scrapePortalPdfs } from "./generic-portal";

const PDF_RE =
  /released|practice|item|test|eog|eoc|leap|staar|mcas|sol|pssa|milestones|ostp|ost|assessment|answer|rationale|sampler|scoring/i;

/** Crawl state pages (depth 1) for any assessment PDF. */
export async function scrapeStateDeep(
  source: StateSourceDef,
): Promise<ReleaseDownloadTarget[]> {
  const targets: ReleaseDownloadTarget[] = [];
  const seen = new Set<string>();
  const urls = [
    source.portalUrl,
    ...(STATE_RELEASE_PAGES[source.stateCode] ?? []),
  ];

  const pagesToFetch = new Set<string>();

  for (const startUrl of urls) {
    pagesToFetch.add(startUrl);
    try {
      const html = await fetchHtml(startUrl);
      const linkRe = /href=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      const origin = new URL(startUrl).origin;
      while ((m = linkRe.exec(html)) !== null) {
        const href = m[1];
        if (href.startsWith("#") || href.startsWith("mailto:")) continue;
        const abs = resolveUrl(href, startUrl);
        if (!abs.startsWith(origin)) continue;
        const lower = abs.toLowerCase();
        if (
          PDF_RE.test(lower) ||
          /assess|test|release|practice|pssa|milestones|mcas|staar|leap|eog|ostp|iar|sbac|caspp|fast|rise|forward/i.test(
            lower,
          )
        ) {
          pagesToFetch.add(abs.split("#")[0]);
        }
      }
    } catch {
      // skip blocked pages
    }
  }

  for (const pageUrl of pagesToFetch) {
    try {
      const fromPage = await scrapePortalPdfs(
        { ...source, portalUrl: pageUrl },
        { maxLinks: 30 },
      );
      for (const t of fromPage) {
        if (seen.has(t.url)) continue;
        seen.add(t.url);
        const fname = `${t.year}-${t.subject}-g${t.grade}-${t.url.split("/").pop()}`;
        targets.push({
          ...t,
          stateCode: source.stateCode,
          sourceId: source.id,
          localPath: `data/state-releases/${source.stateCode}/deep/${fname}`,
        });
      }

      const html = await fetchHtml(pageUrl);
      const hrefRe = /href=["']([^"']+\.(?:pdf|docx|xlsx))["']/gi;
      let m: RegExpExecArray | null;
      while ((m = hrefRe.exec(html)) !== null) {
        const url = resolveUrl(m[1], pageUrl);
        if (seen.has(url) || !PDF_RE.test(url)) continue;
        seen.add(url);
        const fname = url.split("/").pop()!;
        targets.push({
          stateCode: source.stateCode,
          stateName: source.stateCode,
          sourceId: source.id,
          year: 2024,
          grade: 5,
          subject: /math|algebra/i.test(url) ? "math" : "ela",
          url,
          localPath: `data/state-releases/${source.stateCode}/deep/${fname}`,
          importMode: "FULL",
        });
      }
    } catch {
      // continue
    }
  }

  return targets;
}

export async function scrapeAllStatesDeep(
  sources: StateSourceDef[],
): Promise<ReleaseDownloadTarget[]> {
  const results: ReleaseDownloadTarget[] = [];
  const needDeep = sources.filter(
    (s) => !["NY", "MA", "TX"].includes(s.stateCode),
  );

  const CONCURRENCY = 8;
  let idx = 0;

  async function worker() {
    while (idx < needDeep.length) {
      const i = idx++;
      const source = needDeep[i];
      try {
        const found = await scrapeStateDeep(source);
        if (found.length) {
          console.log(`    ${source.stateCode} deep: ${found.length} PDFs`);
          results.push(...found);
        }
      } catch {
        // skip
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return results;
}
