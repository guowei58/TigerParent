import fs from "fs";

export function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function isPdfFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const fd = fs.openSync(filePath, "r");
  try {
    const head = Buffer.alloc(5);
    fs.readSync(fd, head, 0, 5, 0);
    return isPdfBuffer(head);
  } finally {
    fs.closeSync(fd);
  }
}

/** Remove fake PDFs (HTML error pages). Returns count deleted. */
export function purgeInvalidPdfFiles(rootDir: string): number {
  let removed = 0;
  if (!fs.existsSync(rootDir)) return 0;

  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${ent.name}`;
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!ent.name.toLowerCase().endsWith(".pdf")) continue;
      if (!isPdfFile(full)) {
        fs.unlinkSync(full);
        removed++;
      }
    }
  }

  walk(rootDir);
  return removed;
}
