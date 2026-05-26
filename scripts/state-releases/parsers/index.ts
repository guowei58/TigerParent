import fs from "fs";
import type { ReleaseDownloadTarget } from "../catalog";
import { parseMcasPdf } from "./mcas";
import { parseNysedPdf } from "./nysed";
import { parseStaarRelease, shouldSkipStaarDuplicate } from "./staar";
import type { ImportItemInput } from "@/lib/content-provenance/import-pipeline";
import type { SkillContext } from "../../lib/import-helpers";

const staarParsed = new Set<string>();

export async function parseReleasePdf(
  target: ReleaseDownloadTarget,
  ctx: SkillContext,
): Promise<ImportItemInput[]> {
  if (!fs.existsSync(target.localPath)) return [];
  if (fs.statSync(target.localPath).size < 5000) return [];

  switch (target.sourceId) {
    case "nysed-released":
      return parseNysedPdf(target, ctx);
    case "ma-mcas-released":
      return parseMcasPdf(target, ctx);
    case "tea-staar":
      if (shouldSkipStaarDuplicate(target, staarParsed)) return [];
      return parseStaarRelease(target, ctx);
    default:
      return [];
  }
}
