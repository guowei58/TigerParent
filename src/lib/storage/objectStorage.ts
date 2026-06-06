import { S3Client } from "@aws-sdk/client-s3";

/** S3-compatible object storage (Cloudflare R2, Backblaze B2, AWS S3). */
export function objectStorageConfigured(): boolean {
  return Boolean(
    objectStorageAccessKeyId() &&
      objectStorageSecretAccessKey() &&
      objectStorageBucketName() &&
      objectStorageEndpoint(),
  );
}

export function objectStorageAccessKeyId(): string | undefined {
  return process.env.S3_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
}

export function objectStorageSecretAccessKey(): string | undefined {
  return process.env.S3_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
}

export function objectStorageBucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME ?? process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("S3_BUCKET_NAME or R2_BUCKET_NAME is not set");
  return bucket;
}

export function objectStorageEndpoint(): string | undefined {
  if (process.env.S3_ENDPOINT?.trim()) {
    return process.env.S3_ENDPOINT.trim().replace(/\/$/, "");
  }
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return undefined;
}

export function createObjectStorageClient(): S3Client {
  const accessKeyId = objectStorageAccessKeyId();
  const secretAccessKey = objectStorageSecretAccessKey();
  const endpoint = objectStorageEndpoint();
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      "Object storage is not configured. Set S3_* vars (B2/AWS) or R2_* vars (Cloudflare).",
    );
  }

  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

export function pdfAssetsPublicBaseUrl(): string | null {
  const base = process.env.PDF_ASSETS_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  return base.replace(/\/$/, "");
}
