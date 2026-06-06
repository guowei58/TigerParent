import { GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  createObjectStorageClient,
  objectStorageBucketName,
  objectStorageConfigured,
} from "@/lib/storage/objectStorage";
import { resolveDataPath } from "@/lib/storage/fileStorage";

const ROOT = path.join(process.cwd(), "data").replace(/\\/g, "/");

function contentTypeForExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".webm") return "audio/webm";
  if (ext === ".m4a") return "audio/mp4";
  return "application/octet-stream";
}

async function readFromR2(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (!objectStorageConfigured()) return null;
  try {
    const response = await createObjectStorageClient().send(
      new GetObjectCommand({ Bucket: objectStorageBucketName(), Key: key }),
    );
    if (!response.Body) return null;
    const bytes = await response.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType ?? contentTypeForExt(path.extname(key)),
    };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const key = segments.join("/");
  const filePath = resolveDataPath(path.join("data", ...segments));
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  if (!normalized.toLowerCase().startsWith(ROOT.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const etag = `"${stat.mtimeMs}-${stat.size}"`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentTypeForExt(ext),
        "Cache-Control": "public, max-age=86400, must-revalidate",
        ETag: etag,
      },
    });
  }

  const remote = await readFromR2(key);
  if (remote) {
    return new NextResponse(new Uint8Array(remote.body), {
      headers: {
        "Content-Type": remote.contentType,
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
