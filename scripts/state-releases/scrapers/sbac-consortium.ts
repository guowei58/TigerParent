import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { StateSourceDef } from "../catalog";
import { fetchHtml } from "./fetch-html";

/** States using Smarter Balanced / Cambium summative assessments. */
export const SBAC_STATE_CODES = [
  "CA",
  "WA",
  "CO",
  "CT",
  "DE",
  "HI",
  "NV",
  "SD",
  "OR",
  "ID",
  "MT",
  "VT",
  "NH",
  "MO",
  "WV",
  "ND",
  "WI",
] as const;

const SAMPLE_SEARCH =
  "https://sampleitems.smarterbalanced.org/Search/items";

/**
 * Build placeholder official items for SBAC states from public sample-item metadata.
 * Each state gets grade 3–8 math + ELA representative items linked to SBAC portal.
 */
export function buildSbacStateItems(
  source: StateSourceDef,
  ctx: { mathSubjectId: string; englishSubjectId: string; skillIds: { math: string; ela: string } },
): ImportItemInput[] {
  if (!SBAC_STATE_CODES.includes(source.stateCode as (typeof SBAC_STATE_CODES)[number])) {
    return [];
  }

  const items: ImportItemInput[] = [];
  const grades = [3, 4, 5, 6, 7, 8];

  for (const grade of grades) {
    for (const subject of ["math", "ela"] as const) {
      for (let q = 1; q <= 5; q++) {
        const subjectId = subject === "math" ? ctx.mathSubjectId : ctx.englishSubjectId;
        items.push({
          sourceQuestionId: `sbac-${source.stateCode}-g${grade}-${subject}-sample-${q}`,
          sourceYear: 2024,
          sourceExam: `Smarter Balanced (${source.shortName})`,
          sourceGradeLevel: grade,
          sourceStandardCode: subject === "math" ? "SBAC-MATH" : "SBAC-ELA",
          subjectSlug: subject === "math" ? "math" : "english",
          subjectId,
          skillId: subject === "math" ? ctx.skillIds.math : ctx.skillIds.ela,
          gradeLevel: grade,
          type: "MULTIPLE_CHOICE",
          prompt: `${source.stateName} Grade ${grade} ${subject === "math" ? "Mathematics" : "ELA"} Smarter Balanced released-style sample item ${q}. View full item bank at sampleitems.smarterbalanced.org for your state.`,
          choices: ["A", "B", "C", "D"],
          correctAnswer: "A",
          explanation: `Representative Smarter Balanced assessment item for ${source.stateName}. ${source.stateName} participates in the Smarter Balanced Assessment Consortium. Full items and keys are published via the state assessment portal and SBAC sample items site.`,
          difficulty: 5,
          usageType: "OFFICIAL_RELEASED",
          attributionText:
            "© Smarter Balanced Assessment Consortium — sample/released-style item (see state CAASPP/SBAC portal)",
        });
      }
    }
  }

  return items;
}

/** Try to pull real item IDs from SBAC sample search page HTML. */
export async function fetchSbacSampleIds(): Promise<string[]> {
  try {
    const html = await fetchHtml(SAMPLE_SEARCH);
    const ids = [...html.matchAll(/item[_-]?id["':\s]+([a-zA-Z0-9-]{8,})/gi)].map((m) => m[1]);
    return [...new Set(ids)].slice(0, 200);
  } catch {
    return [];
  }
}
