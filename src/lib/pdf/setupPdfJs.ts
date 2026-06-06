import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api.js";

let configured = false;

function pdfjsPackageRoot(): string {
  const require = createRequire(import.meta.url);
  return path.dirname(require.resolve("pdfjs-dist/package.json"));
}

/**
 * Directory path for pdf.js asset factories. Must end with "/" (forward slash) —
 * pdf.js rejects Windows backslash trailing separators.
 */
function pdfJsAssetDir(...segments: string[]): string {
  const dir = path.join(pdfjsPackageRoot(), ...segments).replace(/\\/g, "/");
  return dir.endsWith("/") ? dir : `${dir}/`;
}

/** pdf.js init params for Node: JPEG2000/JBIG2 scans need wasmUrl; fonts need standardFontDataUrl. */
export function getPdfJsDocumentInitParams(): Partial<DocumentInitParameters> {
  return {
    standardFontDataUrl: pdfJsAssetDir("standard_fonts"),
    cMapUrl: pdfJsAssetDir("cmaps"),
    cMapPacked: true,
    wasmUrl: pdfJsAssetDir("wasm"),
    useWorkerFetch: false,
  };
}

/** Configure pdf.js worker for Node (must run before pdf-to-img / getDocument). */
export async function setupPdfJs() {
  if (configured) return;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const require = createRequire(import.meta.url);
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  configured = true;
}
