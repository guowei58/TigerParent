import type { ReleaseDownloadTarget } from "../catalog";

/**
 * Smarter Balanced practice / training test entry points.
 * Full item bodies live in the Cambium online player; we catalog PDF guides
 * and fixed sample-item resources where states publish them.
 */
const SBAC_STATES: Array<{ stateCode: string; stateName: string; sourceId: string }> = [
  { stateCode: "CA", stateName: "California", sourceId: "ca-sbac-released" },
  { stateCode: "WA", stateName: "Washington", sourceId: "wa-sbac-released" },
  { stateCode: "CO", stateName: "Colorado", sourceId: "co-cmas-released" },
  { stateCode: "CT", stateName: "Connecticut", sourceId: "ct-smarter-released" },
  { stateCode: "DE", stateName: "Delaware", sourceId: "de-sbac-released" },
  { stateCode: "HI", stateName: "Hawaii", sourceId: "hi-sbac-released" },
  { stateCode: "NV", stateName: "Nevada", sourceId: "nv-smartersummative-released" },
  { stateCode: "SD", stateName: "South Dakota", sourceId: "sd-sd-sba-released" },
];

/** Public SBAC-hosted PDFs (scoring guides, rubrics) usable as reference items. */
const SBAC_PDF_RESOURCES: Array<{
  url: string;
  subject: "math" | "ela";
  grade: number;
  label: string;
}> = [
  {
    url: "https://portal.smarterbalanced.org/library/en/performance-tasks/scoring/4-point-math-rubrics.pdf",
    subject: "math",
    grade: 6,
    label: "math-rubrics",
  },
  {
    url: "https://portal.smarterbalanced.org/library/en/performance-tasks/scoring/4-point-ela-rubrics.pdf",
    subject: "ela",
    grade: 6,
    label: "ela-rubrics",
  },
];

/**
 * Generate metadata targets for SBAC consortium states.
 * Marks practice portal URLs; imports rubric PDFs where downloadable.
 */
export async function scrapeSbacTargets(): Promise<ReleaseDownloadTarget[]> {
  const targets: ReleaseDownloadTarget[] = [];

  for (const pdf of SBAC_PDF_RESOURCES) {
    for (const state of SBAC_STATES) {
      targets.push({
        stateCode: state.stateCode,
        stateName: state.stateName,
        sourceId: state.sourceId,
        year: 2024,
        grade: pdf.grade,
        subject: pdf.subject,
        url: pdf.url,
        localPath: `data/state-releases/${state.stateCode}/sbac/${pdf.label}.pdf`,
        importMode: "FULL",
      });
    }
  }

  return targets;
}

/** Practice test player base URL (for future Cambium item API integration). */
export const SBAC_PRACTICE_PORTAL = "https://sbac.portal.cambiumast.com/";
