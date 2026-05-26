/**
 * Catalog of downloadable state assessment release documents.
 * Each target maps to a predictable URL where states publish PDFs publicly.
 */

import { REMAINING_STATE_SOURCES } from "./catalog-states-remaining";

export type ReleaseSubject = "math" | "ela";
export type ImportMode = "FULL" | "LINK_ONLY";

export type ReleaseDownloadTarget = {
  stateCode: string;
  stateName: string;
  sourceId: string;
  year: number;
  grade: number;
  subject: ReleaseSubject;
  url: string;
  localPath: string;
  importMode: ImportMode;
};

export type StateSourceDef = {
  id: string;
  name: string;
  shortName: string;
  stateCode: string;
  publisher: string;
  portalUrl: string;
  importMode: ImportMode;
  subjects: ReleaseSubject[];
  gradeRange: [number, number];
  yearRange: [number, number];
};

/** All US states + DC with assessment info for registry. */
export const STATE_SOURCES: StateSourceDef[] = [
  {
    id: "nysed-released",
    name: "NYSED Released Questions",
    shortName: "NYSED",
    stateCode: "NY",
    publisher: "New York State Education Department",
    portalUrl: "https://www.nysedregents.org/ei/ei-math.html",
    importMode: "FULL",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2016, 2025],
  },
  {
    id: "ma-mcas-released",
    name: "Massachusetts MCAS Released Items",
    shortName: "MA MCAS",
    stateCode: "MA",
    publisher: "Massachusetts DESE",
    portalUrl: "https://www.doe.mass.edu/mcas/testitems.html",
    importMode: "FULL",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2019, 2025],
  },
  {
    id: "tea-staar",
    name: "TEA STAAR Released Items",
    shortName: "TEA STAAR",
    stateCode: "TX",
    publisher: "Texas Education Agency",
    portalUrl: "https://tea.texas.gov/student-assessment/staar/staar-released-test-questions",
    importMode: "FULL",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2016, 2025],
  },
  {
    id: "va-sol-released",
    name: "Virginia SOL Released Tests",
    shortName: "VA SOL",
    stateCode: "VA",
    publisher: "Virginia Department of Education",
    portalUrl: "https://www.doe.virginia.gov/teaching-learning-assessment/student-assessment/sol-practice-items-all-subjects/released-tests-item-sets-all-subjects",
    importMode: "FULL",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2014, 2015],
  },
  {
    id: "fl-fast-released",
    name: "Florida FAST Released Items",
    shortName: "FL FAST",
    stateCode: "FL",
    publisher: "Florida Department of Education",
    portalUrl: "https://flfast.org/",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2023, 2025],
  },
  {
    id: "pa-pssa-released",
    name: "Pennsylvania PSSA Released Items",
    shortName: "PA PSSA",
    stateCode: "PA",
    publisher: "Pennsylvania Department of Education",
    portalUrl: "https://www.education.pa.gov/K-12/Assessment%20and%20Accountability/PSSA/Pages/default.aspx",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "oh-ost-released",
    name: "Ohio State Tests Released Items",
    shortName: "OH OST",
    stateCode: "OH",
    publisher: "Ohio Department of Education",
    portalUrl: "https://education.ohio.gov/Topics/Testing/Ohios-State-Test-in-ELA-Math-Science-SocialStudies",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "ga-milestones-released",
    name: "Georgia Milestones Released Items",
    shortName: "GA Milestones",
    stateCode: "GA",
    publisher: "Georgia Department of Education",
    portalUrl: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Assessment/Pages/Georgia-Milestones-Assessment-System.aspx",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "ca-sbac-released",
    name: "California Smarter Balanced / CAASPP",
    shortName: "CA SBAC",
    stateCode: "CA",
    publisher: "California Department of Education",
    portalUrl: "https://www.caaspp-elpac.org/resources/preparation/practice-and-training-tests/practice-and-training-resources",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "nc-eog-released",
    name: "North Carolina EOG Released Items",
    shortName: "NC EOG",
    stateCode: "NC",
    publisher: "North Carolina DPI",
    portalUrl: "https://www.dpi.nc.gov/districts-schools/testing-and-school-accountability/state-tests",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "nj-njsla-released",
    name: "New Jersey NJSLA Released Items",
    shortName: "NJ NJSLA",
    stateCode: "NJ",
    publisher: "New Jersey Department of Education",
    portalUrl: "https://www.nj.gov/education/assessment/",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "il-iar-released",
    name: "Illinois IAR Released Items",
    shortName: "IL IAR",
    stateCode: "IL",
    publisher: "Illinois State Board of Education",
    portalUrl: "https://www.isbe.net/Pages/Illinois-Assessment-of-Readiness.aspx",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "mi-mstep-released",
    name: "Michigan M-STEP Released Items",
    shortName: "MI M-STEP",
    stateCode: "MI",
    publisher: "Michigan Department of Education",
    portalUrl: "https://www.michigan.gov/mde/services/student-assessment",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "co-cmas-released",
    name: "Colorado CMAS Released Items",
    shortName: "CO CMAS",
    stateCode: "CO",
    publisher: "Colorado Department of Education",
    portalUrl: "https://www.cde.state.co.us/assessment",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "wa-sbac-released",
    name: "Washington Smarter Balanced Released Items",
    shortName: "WA SBAC",
    stateCode: "WA",
    publisher: "Washington OSPI",
    portalUrl: "https://wa.portal.cambiumast.com/",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "tn-tcap-released",
    name: "Tennessee TCAP Released Items",
    shortName: "TN TCAP",
    stateCode: "TN",
    publisher: "Tennessee Department of Education",
    portalUrl: "https://www.tn.gov/education/assessment.html",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "az-aasa-released",
    name: "Arizona AASA Released Items",
    shortName: "AZ AASA",
    stateCode: "AZ",
    publisher: "Arizona Department of Education",
    portalUrl: "https://www.azed.gov/assessment",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "in-ilearn-released",
    name: "Indiana ILEARN Released Items",
    shortName: "IN ILEARN",
    stateCode: "IN",
    publisher: "Indiana Department of Education",
    portalUrl: "https://www.in.gov/doe/students/assessment/",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "md-mcap-released",
    name: "Maryland MCAP Released Items",
    shortName: "MD MCAP",
    stateCode: "MD",
    publisher: "Maryland State Department of Education",
    portalUrl: "https://marylandpublicschools.org/about/Pages/DAAIT/Assessment/index.aspx",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  {
    id: "sc-scready-released",
    name: "South Carolina SCReady Released Items",
    shortName: "SC SCReady",
    stateCode: "SC",
    publisher: "South Carolina Department of Education",
    portalUrl: "https://ed.sc.gov/tests/sc-ready/",
    importMode: "LINK_ONLY",
    subjects: ["math", "ela"],
    gradeRange: [3, 8],
    yearRange: [2015, 2024],
  },
  ...REMAINING_STATE_SOURCES,
];

function nysedUrls(year: number, grade: number, subject: ReleaseSubject): string[] {
  const subj = subject === "math" ? "math" : "ela";
  const base = `https://www.nysedregents.org/ei/${subj}/${year}/${year}-released-items-${subj}-g${grade}.pdf`;
  const alt2022 =
    year === 2022
      ? `https://www.nysedregents.org/ei/${subj}/${year}/english/${year}-released-items-${subj}-g${grade}.pdf`
      : null;
  return alt2022 ? [base, alt2022] : [base];
}

function mcasUrls(year: number, grade: number, subject: ReleaseSubject): string[] {
  const subj = subject === "math" ? "math" : "ela";
  const urls = [
    `https://www.doe.mass.edu/mcas/${year}/release/g${grade}-${subj}.pdf`,
    `https://www.doe.mass.edu/mcas/${year}/release/gr${grade}-${subj}.pdf`,
  ];
  if (grade === 10) {
    urls.push(`https://www.doe.mass.edu/mcas/${year}/release/g10-${subj}.pdf`);
  }
  return urls;
}

function staarUrls(year: number, grade: number, subject: ReleaseSubject): string[] {
  const base = "https://tea.texas.gov/student-assessment/staar/released-test-questions";
  const subj = subject === "math" ? "math" : "rla";
  const urls: string[] = [];

  // Modern format (2022+): answer key + rationale PDFs
  if (year >= 2022) {
    urls.push(`${base}/${year}-staar-${subj}-${grade}-answer-key.pdf`);
    urls.push(`${base}/${year}-staar-${subj}-${grade}-rationale.pdf`);
  }

  // Legacy format (2016–2021): full test booklet + key + rationales
  if (year <= 2021) {
    const legacySubj = subject === "math" ? "math" : "reading";
    urls.push(`${base}/${year}-staar-${grade}-${legacySubj}-test.pdf`);
    urls.push(`${base}/${year}-staar-${grade}-${legacySubj}-key.pdf`);
    urls.push(`${base}/${year}-${grade}-${legacySubj}-rationales.pdf`);
    urls.push(`${base}/${year}-staar-${grade}-${legacySubj}-rationales.pdf`);
  }

  return urls;
}

function vaSolUrls(grade: number, subject: ReleaseSubject): string[] {
  if (subject === "math") {
    return [
      `https://www.doe.virginia.gov/testing/sol/released_tests/2014/math_${grade}.pdf`,
      `https://www.doe.virginia.gov/testing/sol/released_tests/2015/math_${grade}.pdf`,
    ];
  }
  return [
    `https://www.doe.virginia.gov/testing/sol/released_tests/2014/reading_${grade}.pdf`,
    `https://www.doe.virginia.gov/testing/sol/released_tests/2015/reading_${grade}.pdf`,
  ];
}

/** Generate every downloadable PDF target we know how to fetch. */
export function generateDownloadTargets(): ReleaseDownloadTarget[] {
  const targets: ReleaseDownloadTarget[] = [];

  const nysed = STATE_SOURCES.find((s) => s.id === "nysed-released")!;
  for (let year = nysed.yearRange[0]; year <= nysed.yearRange[1]; year++) {
    for (let grade = nysed.gradeRange[0]; grade <= nysed.gradeRange[1]; grade++) {
      for (const subject of nysed.subjects) {
        for (const url of nysedUrls(year, grade, subject)) {
          targets.push({
            stateCode: "NY",
            stateName: "New York",
            sourceId: nysed.id,
            year,
            grade,
            subject,
            url,
            localPath: `data/state-releases/NY/${year}/${subject}/g${grade}.pdf`,
            importMode: "FULL",
          });
        }
      }
    }
  }

  const mcas = STATE_SOURCES.find((s) => s.id === "ma-mcas-released")!;
  for (let year = mcas.yearRange[0]; year <= mcas.yearRange[1]; year++) {
    for (let grade = mcas.gradeRange[0]; grade <= mcas.gradeRange[1]; grade++) {
      for (const subject of mcas.subjects) {
        for (const url of mcasUrls(year, grade, subject)) {
          targets.push({
            stateCode: "MA",
            stateName: "Massachusetts",
            sourceId: mcas.id,
            year,
            grade,
            subject,
            url,
            localPath: `data/state-releases/MA/${year}/${subject}/g${grade}-${url.split("/").pop()}`,
            importMode: "FULL",
          });
        }
      }
    }
  }

  const va = STATE_SOURCES.find((s) => s.id === "va-sol-released")!;
  for (const year of [2014, 2015]) {
    for (let grade = va.gradeRange[0]; grade <= va.gradeRange[1]; grade++) {
      for (const subject of va.subjects) {
        for (const url of vaSolUrls(grade, subject)) {
          if (!url.includes(String(year))) continue;
          targets.push({
            stateCode: "VA",
            stateName: "Virginia",
            sourceId: va.id,
            year,
            grade,
            subject,
            url,
            localPath: `data/state-releases/VA/${year}/${subject}/g${grade}.pdf`,
            importMode: "FULL",
          });
        }
      }
    }
  }

  // STAAR released PDFs — grades 3–8, math + RLA, 2016–2025
  const staar = STATE_SOURCES.find((s) => s.id === "tea-staar")!;
  for (let year = staar.yearRange[0]; year <= staar.yearRange[1]; year++) {
    for (let grade = staar.gradeRange[0]; grade <= staar.gradeRange[1]; grade++) {
      for (const subject of staar.subjects) {
        for (const url of staarUrls(year, grade, subject)) {
          const fname = url.split("/").pop()!;
          targets.push({
            stateCode: "TX",
            stateName: "Texas",
            sourceId: staar.id,
            year,
            grade,
            subject,
            url,
            localPath: `data/state-releases/TX/${year}/${subject}/g${grade}-${fname}`,
            importMode: "FULL",
          });
        }
      }
    }
  }

  return targets;
}

export function countTargetsByState(targets: ReleaseDownloadTarget[]) {
  const counts = new Map<string, number>();
  for (const t of targets) {
    counts.set(t.stateCode, (counts.get(t.stateCode) ?? 0) + 1);
  }
  return counts;
}
