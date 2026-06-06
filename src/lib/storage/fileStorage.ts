import fs from "fs";
import path from "path";
import crypto from "crypto";
import { toDataRelativePath, publicPathFromData } from "@/lib/storage/dataPaths";

export { toDataRelativePath, publicPathFromData };

const DATA_ROOT = path.join(process.cwd(), "data");
const DATA_ROOT_NORM = DATA_ROOT.replace(/\\/g, "/");

/** Resolve a DB-stored path (relative or legacy absolute) to an on-disk file. */
export function resolveDataPath(storedPath: string): string {
  const normalized = storedPath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const rootLower = DATA_ROOT_NORM.toLowerCase();
  if (lower.startsWith(rootLower + "/") || /^[a-z]:\//i.test(normalized)) {
    return path.normalize(normalized);
  }
  return path.join(DATA_ROOT, normalized.replace(/^data\//, ""));
}

export function pdfUploadDir(): string {
  return path.join(DATA_ROOT, "pdf-uploads");
}

export function pdfPagesDir(sourceDocumentId: string): string {
  return path.join(DATA_ROOT, "pdf-pages", sourceDocumentId);
}

export function pdfCropsDir(sourceDocumentId: string): string {
  return path.join(DATA_ROOT, "pdf-crops", sourceDocumentId);
}

export function parsedAuditDir(): string {
  return path.join(DATA_ROOT, "parsed");
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function sha256File(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function sha256Buffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function saveUploadedPdf(fileName: string, buffer: Buffer): { storedPath: string; hash: string } {
  const dir = pdfUploadDir();
  ensureDir(dir);
  const safe = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const hash = sha256Buffer(buffer);
  const storedPath = path.join(dir, `${hash.slice(0, 16)}-${safe}`);
  fs.writeFileSync(storedPath, buffer);
  return { storedPath: storedPath.replace(/\\/g, "/"), hash };
}
