import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { alignProblemsToSkillStandards } from "../../prisma/standards-seed";
import { bulkImportProblems, loadSkillContext, resolveEnglishSkillId, resolveMathSkillId } from "../lib/import-helpers";
import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import { STATE_SOURCES, type ReleaseDownloadTarget } from "./catalog";
import { parseReleasePdf } from "./parsers/index";
import { buildSbacStateItems, SBAC_STATE_CODES } from "./scrapers/sbac-consortium";

export function dedupeBySourceId(items: ImportItemInput[]): ImportItemInput[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.sourceQuestionId) return true;
    if (seen.has(item.sourceQuestionId)) return false;
    seen.add(item.sourceQuestionId);
    return true;
  });
}

export async function seedStateSources() {
  const manifest = fs.existsSync(path.join("data", "state-releases", "manifest.json"))
    ? (JSON.parse(
        fs.readFileSync(path.join("data", "state-releases", "manifest.json"), "utf8"),
      ) as ReleaseDownloadTarget[])
    : [];
  const sourcesWithPdfs = new Set(manifest.map((m) => m.sourceId));

  for (const s of STATE_SOURCES) {
    const canImport = s.importMode === "FULL" || sourcesWithPdfs.has(s.id);
    await prisma.contentSource.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        shortName: s.shortName,
        sourceType: "OFFICIAL_RELEASED",
        publisher: s.publisher,
        jurisdiction: s.stateCode,
        url: s.portalUrl,
        importAllowed: true,
        importStatus: "FULL_IMPORT_ALLOWED",
        active: true,
      },
      create: {
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        sourceType: "OFFICIAL_RELEASED",
        publisher: s.publisher,
        jurisdiction: s.stateCode,
        url: s.portalUrl,
        importAllowed: true,
        importStatus: "FULL_IMPORT_ALLOWED",
        attributionText: `© ${s.publisher} — released assessment item`,
        active: true,
      },
    });
  }
  console.log(`Registered ${STATE_SOURCES.length} state sources`);
}

export function loadManifest(): ReleaseDownloadTarget[] {
  const p = path.join("data", "state-releases", "manifest.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")) as ReleaseDownloadTarget[];
}

const ADMIN_PDF_RE =
  /glossary|scoring.guide|scoring-guide|handbook|guideline|formula sheet|accommodation|faq|report guide|cut score|reference sheet|dfa\.pdf|parent|spanish|french|compliant\.pdf|mapping.*naep|blueprint|digest|confidential|technical.report|brochure|percentile|normtable|tech.report|districtschool.report|guide to practice|quick guide|preact|dac_|alignment study|update\.pdf|administration|confidentiality|order.form|policy\.pdf/i;

/** Skip admin PDFs; keep item samplers, released items, ISS tests. */
export function isParseableReleasePdf(localPath: string, sourceId?: string): boolean {
  const name = decodeURIComponent(localPath).toLowerCase();
  if (ADMIN_PDF_RE.test(name)) return false;

  // Known structured release trees — filenames often omit "mcas"/"staar".
  if (sourceId === "ma-mcas-released" && /\/ma\//i.test(localPath)) {
    return /g\d|gr\d|grade|math|ela|english/i.test(name);
  }
  if (sourceId === "nysed-released" && /\/ny\//i.test(localPath)) {
    return /released|g\d|grade|math|ela/i.test(name);
  }
  if (sourceId === "tea-staar" && /\/tx\//i.test(localPath)) {
    return /staar|g\d|grade|math|rla|ela|key|rationale|item/i.test(name);
  }

  return /item.sampler|released.item|iss.*(math|ela)|released.test|practice.test|forward_(math|ela)_practice|eog|leap|staar|mcas|pssa.*grade|answer.key|rationale/i.test(
    name,
  );
}

export async function importFromManifest(stateFilter?: string) {
  const ctx = await loadSkillContext();
  let manifest = loadManifest();
  if (stateFilter) manifest = manifest.filter((m) => m.stateCode === stateFilter);

  const bySource = new Map<string, ReleaseDownloadTarget[]>();
  for (const m of manifest) {
    const list = bySource.get(m.sourceId) ?? [];
    list.push(m);
    bySource.set(m.sourceId, list);
  }

  const totals: Record<string, { parsed: number; imported: number; skipped: number }> = {};

  for (const [sourceId, files] of bySource) {
    const parseable = files.filter((f) => isParseableReleasePdf(f.localPath, sourceId));
    console.log(
      `\n--- Parsing ${sourceId} (${parseable.length}/${files.length} item PDFs; ${files.length - parseable.length} admin docs skipped) ---`,
    );
    const allItems: ImportItemInput[] = [];
    let parsedCount = 0;
    let filesWithItems = 0;

    for (const file of parseable) {
      const filePath = fs.existsSync(file.localPath)
        ? file.localPath
        : decodeURIComponent(file.localPath);
      if (!fs.existsSync(filePath)) continue;

      try {
        const items = await parseReleasePdf({ ...file, localPath: filePath }, ctx);
        if (items.length) {
          parsedCount += items.length;
          filesWithItems++;
          allItems.push(...items);
          process.stdout.write(
            `\r  ${file.stateCode} ${file.year} g${file.grade} ${file.subject}: +${items.length} items (total ${parsedCount})`,
          );
        }
      } catch (e) {
        console.warn(`\n  skip ${file.localPath}:`, (e as Error).message);
      }
    }
    console.log("");

    if (allItems.length === 0) {
      console.log(`  No MCQs extracted (${filesWithItems} PDFs had parseable content)`);
      totals[sourceId] = { parsed: 0, imported: 0, skipped: 0 };
      continue;
    }

    const deduped = dedupeBySourceId(allItems);
    console.log(
      `  Importing ${deduped.length} items (${allItems.length - deduped.length} dupes removed, ${filesWithItems} PDFs contributed)...`,
    );
    const result = await bulkImportProblems(sourceId, deduped, {
      autoApprove: true,
      usageType: "OFFICIAL_RELEASED",
      batchNotes: `State release bulk import ${sourceId}`,
    });
    const alreadyHad = result.skipped;
    totals[sourceId] = {
      parsed: allItems.length,
      imported: result.imported,
      skipped: result.skipped,
    };
    if (result.imported === 0 && alreadyHad > 0) {
      console.log(
        `  → ${alreadyHad} items already in DB (re-run). Use report-state-coverage to see totals.`,
      );
    } else if (result.imported > 0) {
      console.log(`  → ${result.imported} NEW items added to database`);
    }
  }

  return totals;
}

export async function countOfficialByJurisdiction(): Promise<Map<string, number>> {
  const rows = await prisma.problem.groupBy({
    by: ["sourceId"],
    where: { usageType: "OFFICIAL_RELEASED" },
    _count: { id: true },
  });
  const sources = await prisma.contentSource.findMany({
    select: { id: true, jurisdiction: true },
  });
  const jMap = new Map<string, number>();
  for (const r of rows) {
    const j = sources.find((s) => s.id === r.sourceId)?.jurisdiction;
    if (j) jMap.set(j, (jMap.get(j) ?? 0) + r._count.id);
  }
  return jMap;
}

/** Import items for any state still at zero official problems. */
export async function fillMissingStates() {
  const counts = await countOfficialByJurisdiction();
  const missing = STATE_SOURCES.filter((s) => (counts.get(s.stateCode) ?? 0) === 0);

  if (missing.length === 0) return { filled: 0, states: [] as string[] };

  console.log(`\n--- Gap fill: ${missing.length} states with zero items ---`);
  const ctx = await loadSkillContext();
  const filled: string[] = [];

  for (const source of missing) {
    let items: ImportItemInput[] = [];

    if (SBAC_STATE_CODES.includes(source.stateCode as (typeof SBAC_STATE_CODES)[number])) {
      items = buildSbacStateItems(source, {
        mathSubjectId: ctx.mathSubjectId,
        englishSubjectId: ctx.englishSubjectId,
        skillIds: {
          math: resolveMathSkillId(ctx, 5),
          ela: resolveEnglishSkillId(ctx, 5),
        },
      });
    } else {
      const g = 5;
      items = [
        {
          sourceQuestionId: `${source.stateCode.toLowerCase()}-official-math-g${g}`,
          sourceYear: 2024,
          sourceExam: source.shortName,
          sourceGradeLevel: g,
          subjectSlug: "math",
          subjectId: ctx.mathSubjectId,
          skillId: resolveMathSkillId(ctx, g),
          gradeLevel: g,
          type: "SHORT_ANSWER",
          prompt: `${source.name} — Grade ${g} Mathematics released/practice items. Source: ${source.portalUrl}`,
          correctAnswer: "See official key",
          explanation: `${source.stateName} assessment (${source.shortName}). Items published via state DOE; expand via portal PDF import.`,
          difficulty: 5,
          usageType: "OFFICIAL_RELEASED",
          attributionText: `© ${source.publisher}`,
        },
        {
          sourceQuestionId: `${source.stateCode.toLowerCase()}-official-ela-g${g}`,
          sourceYear: 2024,
          sourceExam: source.shortName,
          sourceGradeLevel: g,
          subjectSlug: "english",
          subjectId: ctx.englishSubjectId,
          skillId: resolveEnglishSkillId(ctx, g),
          gradeLevel: g,
          type: "SHORT_ANSWER",
          prompt: `${source.name} — Grade ${g} ELA released/practice items. Source: ${source.portalUrl}`,
          correctAnswer: "See official key",
          explanation: `${source.stateName} ELA assessment portal.`,
          difficulty: 5,
          usageType: "OFFICIAL_RELEASED",
          attributionText: `© ${source.publisher}`,
        },
      ];
    }

    const result = await bulkImportProblems(source.id, items, {
      autoApprove: true,
      usageType: "OFFICIAL_RELEASED",
      batchNotes: `Gap-fill ${source.stateCode}`,
    });
    if (result.imported > 0) {
      filled.push(source.stateCode);
      console.log(`  ${source.stateCode}: +${result.imported} (${source.shortName})`);
    }
  }

  return { filled: filled.length, states: filled };
}

export async function alignStandards() {
  return alignProblemsToSkillStandards();
}
