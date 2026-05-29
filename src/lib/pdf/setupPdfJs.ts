import { createRequire } from "module";
import { pathToFileURL } from "url";

let configured = false;

/** Configure pdf.js worker for Node (must run before pdf-to-img / getDocument). */
export async function setupPdfJs() {
  if (configured) return;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const require = createRequire(import.meta.url);
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  configured = true;
}
