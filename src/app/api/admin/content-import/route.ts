import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  importContentBatch,
  normalizeStaarItem,
  type ImportItemInput,
} from "@/lib/content-provenance/import-pipeline";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { sourceId, items, format } = body as {
    sourceId: string;
    format?: "staar" | "sat" | "generic";
    items: ImportItemInput[];
  };

  const normalized =
    format === "staar"
      ? items.map((item) => normalizeStaarItem(item as never))
      : items;

  const batch = await importContentBatch(
    sourceId,
    normalized,
    session.user.id,
  );

  return NextResponse.json({ batchId: batch.id, itemCount: normalized.length });
}
