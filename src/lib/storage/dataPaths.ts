const DATA_ROOT_PREFIX = "data/";

/** Store paths relative to `data/` so URLs work across machines. */
export function toDataRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();

  // Strip absolute workspace path prefix when present (server-side paths).
  const dataIdx = lower.indexOf("/data/");
  if (dataIdx >= 0) {
    return normalized.slice(dataIdx + 6);
  }

  if (lower.startsWith(DATA_ROOT_PREFIX)) {
    return normalized.slice(DATA_ROOT_PREFIX.length);
  }

  return normalized;
}

export function publicPathFromData(relativePath: string): string {
  return `/api/pdf-assets/${toDataRelativePath(relativePath)}`;
}
