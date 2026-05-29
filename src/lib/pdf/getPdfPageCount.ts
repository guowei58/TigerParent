import fs from "fs";
import { setupPdfJs } from "./setupPdfJs";

export async function getPdfPageCount(filePath: string): Promise<number> {
  await setupPdfJs();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
  }
}
