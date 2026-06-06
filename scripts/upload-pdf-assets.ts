/**
 * Upload practice images (pdf-crops, pdf-pages) to S3-compatible storage.
 * Works with Backblaze B2, Cloudflare R2, or AWS S3.
 *
 * Usage:
 *   npm run assets:upload
 *   npm run assets:upload -- --dry-run
 */
import "dotenv/config";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import {
  createObjectStorageClient,
  objectStorageBucketName,
  objectStorageConfigured,
  pdfAssetsPublicBaseUrl,
} from "../src/lib/storage/objectStorage";

const UPLOAD_DIRS = ["pdf-crops", "pdf-pages"] as const;

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }) ) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

async function objectExists(
  client: ReturnType<typeof createObjectStorageClient>,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: objectStorageBucketName(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!objectStorageConfigured()) {
    console.error(`
Missing storage credentials. Use ONE of:

  Backblaze B2:
    S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
    S3_ACCESS_KEY_ID=...
    S3_SECRET_ACCESS_KEY=...
    S3_BUCKET_NAME=tigerparent-assets
    PDF_ASSETS_PUBLIC_BASE_URL=https://f000.backblazeb2.com/file/tigerparent-assets

  Cloudflare R2:
    R2_ACCOUNT_ID=...
    R2_ACCESS_KEY_ID=...
    R2_SECRET_ACCESS_KEY=...
    R2_BUCKET_NAME=tigerparent-assets
    PDF_ASSETS_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
`);
    process.exit(1);
  }

  const publicBase = pdfAssetsPublicBaseUrl();
  if (!publicBase) {
    console.warn("PDF_ASSETS_PUBLIC_BASE_URL is not set — upload works but production needs it.");
  }

  const dataRoot = path.join(process.cwd(), "data");
  const client = createObjectStorageClient();
  const bucket = objectStorageBucketName();

  let uploaded = 0;
  let skipped = 0;

  for (const dir of UPLOAD_DIRS) {
    const absDir = path.join(dataRoot, dir);
    const files = walkFiles(absDir);
    console.log(`\n${dir}: ${files.length} files`);

    for (const filePath of files) {
      const key = path.relative(dataRoot, filePath).replace(/\\/g, "/");
      if (await objectExists(client, key)) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  would upload ${key}`);
        uploaded++;
        continue;
      }

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fs.readFileSync(filePath),
          ContentType: contentType(filePath),
          CacheControl: "public, max-age=86400",
        }),
      );
      uploaded++;
      if (uploaded % 50 === 0) console.log(`  uploaded ${uploaded}...`);
    }
  }

  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped}${dryRun ? " (dry run)" : ""}`);
  if (publicBase) {
    console.log(`\nSet on Render: PDF_ASSETS_PUBLIC_BASE_URL=${publicBase}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
