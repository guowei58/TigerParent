/**
 * Rebuild manifest.json from PDFs already on disk (no network).
 * Usage: npm run db:rebuild-state-manifest
 */
import fs from "fs";
import path from "path";
import { isPdfFile } from "../lib/pdf-valid";
import { STATE_SOURCES, type ReleaseDownloadTarget } from "./catalog";
const ROOT = path.join("data", "state-releases");
const MIN_BYTES = 5000;

function loadUrlMap(): Map<string, string> {
  const map = new Map<string, string>();
  const disc = path.join(ROOT, "discovered-targets.json");
  if (!fs.existsSync(disc)) return map;
  const rows = JSON.parse(fs.readFileSync(disc, "utf8")) as ReleaseDownloadTarget[];
  for (const r of rows) {
    if (r.url?.startsWith("http")) map.set(r.localPath.replace(/\\/g, "/"), r.url);
  }
  return map;
}

function inferFromPath(
  rel: string,
  stateCode: string,
): Pick<ReleaseDownloadTarget, "year" | "grade" | "subject"> {
  const lower = rel.toLowerCase();
  const yearMatch = lower.match(/20(1[6-9]|2[0-5])/);
  const gradeMatch = lower.match(/g(?:rade)?[_-]?(\d)|[_-]g(\d)[_.-]/);
  const grade = gradeMatch
    ? Number(gradeMatch[1] ?? gradeMatch[2])
  : lower.match(/grade[_-]?(\d)/)
      ? Number(lower.match(/grade[_-]?(\d)/)![1])
      : 5;
  const subject =
    /math|algebra|geometry|arith/i.test(lower) && !/english|ela|reading|writing/i.test(lower)
      ? "math"
      : /english|ela|reading|writing|literacy/i.test(lower)
        ? "ela"
        : "math";
  return {
    year: yearMatch ? Number(yearMatch[0]) : 2024,
    grade: Math.min(8, Math.max(3, grade)),
    subject,
  };
}

function walkPdfs(dir: string, stateCode: string, out: ReleaseDownloadTarget[]) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkPdfs(full, stateCode, out);
      continue;
    }
    if (!ent.name.toLowerCase().endsWith(".pdf")) continue;
    if (!isPdfFile(full)) continue;
    const stat = fs.statSync(full);
    if (stat.size < MIN_BYTES) continue;

    const source = STATE_SOURCES.find((s) => s.stateCode === stateCode);
    if (!source) continue;

    const rel = path.relative(process.cwd(), full).replace(/\\/g, "/");
    const meta = inferFromPath(rel, stateCode);
    out.push({
      stateCode,
      stateName: source.stateName,
      sourceId: source.id,
      year: meta.year,
      grade: meta.grade,
      subject: meta.subject,
      url: rel,
      localPath: rel,
      importMode: source.importMode,
      size: stat.size,
    });
  }
}

async function main() {
  const urlMap = loadUrlMap();
  const manifest: ReleaseDownloadTarget[] = [];
  for (const s of STATE_SOURCES) {
    walkPdfs(path.join(ROOT, s.stateCode), s.stateCode, manifest);
  }
  for (const m of manifest) {
    if (!isPdfFile(m.localPath)) continue;
    const httpUrl = urlMap.get(m.localPath);
    if (httpUrl) m.url = httpUrl;
  }
  const valid = manifest.filter((m) => isPdfFile(m.localPath));

  fs.mkdirSync(ROOT, { recursive: true });
  const manifestPath = path.join(ROOT, "manifest.json");
  const tmp = `${manifestPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(valid, null, 2));
  fs.renameSync(tmp, manifestPath);

  const byState = new Map<string, number>();
  for (const m of valid) {
    byState.set(m.stateCode, (byState.get(m.stateCode) ?? 0) + 1);
  }

  console.log(`Rebuilt manifest: ${valid.length} valid PDFs (${manifest.length - valid.length} invalid skipped)`);
  for (const [code, n] of [...byState.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
