import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { resolveDataPath } from "@/lib/storage/fileStorage";

const ROOT = path.join(process.cwd(), "data").replace(/\\/g, "/");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const filePath = resolveDataPath(path.join("data", ...segments));
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  if (!normalized.toLowerCase().startsWith(ROOT.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "application/octet-stream";
  return new NextResponse(buf, {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
