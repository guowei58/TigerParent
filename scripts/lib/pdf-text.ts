import fs from "fs";
import { PDFParse } from "pdf-parse";

export async function extractPdfText(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
