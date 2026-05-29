import fs from "fs";
import path from "path";
import {
  countTargetsByState,
  generateDownloadTargets,
  type ReleaseDownloadTarget,
} from "./catalog";
import { isPdfBuffer, isPdfFile } from "../lib/pdf-valid";
import { ensureDir } from "./parsers/shared";
import { discoverAllTargets, mergeTargets } from "./scrapers/index";

const CONCURRENCY = 6;

async function downloadOne(target: ReleaseDownloadTarget): Promise<boolean> {
  if (!target.url.startsWith("http")) return false;

  ensureDir(target.localPath);

  if (fs.existsSync(target.localPath)) {
    if (isPdfFile(target.localPath) && fs.statSync(target.localPath).size > 5000) {
      return true;
    }
    fs.unlinkSync(target.localPath);
  }

  try {
    const res = await fetch(target.url, {
      headers: { "User-Agent": "TigerParent-Education-Importer/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000 || !isPdfBuffer(buf)) return false;
    fs.writeFileSync(target.localPath, buf);
    return true;
  } catch {
    return false;
  }
}

async function runPool<T>(
  items: T[],
  fn: (item: T) => Promise<boolean>,
  concurrency: number,
): Promise<number> {
  let ok = 0;
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      if (await fn(items[i])) ok++;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return ok;
}

export async function downloadStateReleases(options?: { stateCode?: string }) {
  console.log("--- Discovering targets from state portals ---");
  const discovered = await discoverAllTargets();
  let targets = mergeTargets(generateDownloadTargets(), discovered);

  if (options?.stateCode) {
    targets = targets.filter((t) => t.stateCode === options.stateCode);
  }

  // Dedupe by localPath (keep first URL that works)
  const byPath = new Map<string, ReleaseDownloadTarget>();
  for (const t of targets) {
    if (!byPath.has(t.localPath)) byPath.set(t.localPath, t);
  }
  targets = [...byPath.values()];

  console.log(`Download catalog: ${targets.length} PDF targets`);
  const byState = countTargetsByState(targets);
  for (const [state, count] of [...byState.entries()].sort()) {
    console.log(`  ${state}: ${count} files`);
  }

  let done = 0;
  const ok = await runPool(
    targets,
    async (t) => {
      const success = await downloadOne(t);
      done++;
      if (done % 20 === 0) process.stdout.write(`\r  downloaded ${done}/${targets.length}...`);
      return success;
    },
    CONCURRENCY,
  );

  console.log(`\n  ${ok}/${targets.length} PDFs on disk`);

  // Write manifest
  const manifestDir = path.join("data", "state-releases");
  fs.mkdirSync(manifestDir, { recursive: true });
  const manifest = targets
    .filter(
      (t) =>
        fs.existsSync(t.localPath) &&
        fs.statSync(t.localPath).size > 5000 &&
        isPdfFile(t.localPath),
    )
    .map((t) => ({
      ...t,
      size: fs.statSync(t.localPath).size,
    }));
  const manifestPath = path.join(manifestDir, "manifest.json");
  const tmpPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmpPath, manifestPath);
  console.log(`  manifest: ${manifest.length} files`);

  return manifest;
}
