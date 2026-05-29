import fs from "fs";
import { setupPdfJs } from "./setupPdfJs";

export type PageText = {
  pageNumber: number;
  text: string;
};

/** PostgreSQL text columns reject NUL (0x00) bytes. */
export function sanitizePdfText(text: string): string {
  return text.replace(/\u0000/g, "");
}

type TextItem = { str?: string };

async function loadPdfDocument(filePath: string) {
  await setupPdfJs();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));
  return pdfjs.getDocument({ data, useSystemFonts: true }).promise;
}

function textFromContent(items: TextItem[]): string {
  return items
    .map((item) => item.str ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPdfTextByPage(filePath: string): Promise<PageText[]> {
  const doc = await loadPdfDocument(filePath);
  try {
    const pages: PageText[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push({
        pageNumber,
        text: sanitizePdfText(textFromContent(content.items as TextItem[])),
      });
    }
    return pages.length > 0 ? pages : [{ pageNumber: 1, text: "" }];
  } finally {
    await doc.destroy();
  }
}

export async function extractPdfText(filePath: string): Promise<string> {
  const pages = await extractPdfTextByPage(filePath);
  return pages.map((p) => p.text).join("\n\n");
}
