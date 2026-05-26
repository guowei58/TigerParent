import fs from "fs";
import path from "path";

export type McqBlock = {
  prompt: string;
  choices: string[];
  trailingItemNums: number[];
};

export type MapRow = {
  itemNum: number;
  correctAnswer: string;
  standardCode: string;
  domain: string;
  description?: string;
  session?: string;
};

/** Extract all A/B/C/D choice blocks from PDF text in document order. */
export function extractMcqBlocks(text: string): McqBlock[] {
  const blocks: McqBlock[] = [];
  const re =
    /([\s\S]{20,2000}?)\nA[\s\t]+(.+?)\nB[\s\t]+(.+?)\nC[\s\t]+(.+?)\nD[\s\t]+(.+?)(?=\n(?:Page|GO ON|Session|--|\d{1,2}\s*\n|$))/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const rawPrompt = m[1]
      .replace(/Page \d+/gi, "")
      .replace(/GO ON/gi, "")
      .replace(/Session \d+/gi, "")
      .replace(/-- \d+ of \d+ --/g, "")
      .trim();

    const lines = rawPrompt
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^Mathematics Test|^Grade \d|^Spring \d|^RELEASED/i.test(l));

    const prompt = lines.slice(-10).join("\n").trim();
    if (prompt.length < 12) continue;

    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 80);
    const trailingItemNums = [...after.matchAll(/\n(\d{1,2})\n/g)].map((x) =>
      parseInt(x[1], 10),
    );

    blocks.push({
      prompt: prompt.slice(0, 1500),
      choices: [m[2], m[3], m[4], m[5]].map((c) => c.trim().replace(/\s+/g, " ").slice(0, 250)),
      trailingItemNums,
    });
  }

  return blocks;
}

export function parseNysedMap(text: string, subject: "math" | "ela"): MapRow[] {
  const rows: MapRow[] = [];

  // 2017+ NGLS pattern
  const nglsSubject = subject === "math" ? "Math" : "ELA";
  const nglsRe = new RegExp(
    `(\\d+)\\s+Multiple Choice\\s+([A-D])\\s+\\d+\\s+NGLS\\.${nglsSubject}\\.Content\\.(NY-[\\d.A-Za-z]+)\\s+(.+?)\\s+[\\d.]+`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = nglsRe.exec(text)) !== null) {
    rows.push({
      itemNum: parseInt(m[1], 10),
      correctAnswer: m[2],
      standardCode: m[3],
      domain: m[4].trim(),
    });
  }

  // CCSS pattern (2019 and earlier)
  const ccssRe =
    /Session\s+(\d+)\s+(\d+)\s+Multiple Choice\s+([A-D])\s+\d+\s+CCSS\.(?:Math|ELA-Literacy)\.Content\.([\d.A-Z]+)\s+(.+?)(?:\s+[\d.]+|$)/gi;
  while ((m = ccssRe.exec(text)) !== null) {
    rows.push({
      session: m[1],
      itemNum: parseInt(m[2], 10),
      correctAnswer: m[3],
      standardCode: m[4],
      domain: m[5].trim(),
    });
  }

  // Dedupe by itemNum (prefer first match)
  const seen = new Set<number>();
  return rows.filter((r) => {
    if (seen.has(r.itemNum)) return false;
    seen.add(r.itemNum);
    return true;
  });
}

export function parseMcasReleasedTable(text: string): MapRow[] {
  const start = text.indexOf("Released Operational Items");
  if (start < 0) return [];

  const endMarkers = ["Unreleased Operational Items", "Mathematics item types are", "ELA item types are"];
  let end = text.length;
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker, start + 30);
    if (idx > 0) end = Math.min(end, idx);
  }

  const section = text.slice(start, end);
  const rows: MapRow[] = [];
  const itemRe =
    /(?:^|\n)(\d+)\s+(\d+[–—-]?\d*)\s+([\s\S]+?)(?=\n\d+\s+\d+[–—-]?\d*\s+|\n\*|$)/g;

  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(section)) !== null) {
    const block = m[3].replace(/\s+/g, " ").trim();
    const stdMatch = block.match(/(\d+\.[A-Z]+\.[A-Z\d]+)/);
    const typeMatch = block.match(/\s(SR|SA|CR)\s/);
    if (!stdMatch || !typeMatch) continue;

    const stdIdx = block.indexOf(stdMatch[0]);
    const typeIdx = block.indexOf(typeMatch[0]);
    const domain = block.slice(0, stdIdx).trim();
    const afterType = block.slice(typeIdx + typeMatch[0].length).trim();

    // Answer: trailing letter(s), number, or comma-separated choices
    const answerMatch = afterType.match(
      /\s([A-D](?:[,;][A-D,\s]+)?|\d+(?:\.\d+)?)\s*$/,
    );
    const correctAnswer = answerMatch ? answerMatch[1].replace(/\s/g, "") : "";
    const description = answerMatch
      ? afterType.slice(0, -answerMatch[0].length).trim()
      : afterType;

    rows.push({
      itemNum: parseInt(m[1], 10),
      domain,
      standardCode: stdMatch[1],
      description,
      correctAnswer: correctAnswer.split(/[,;]/)[0] ?? correctAnswer,
    });
  }

  return rows;
}

export function matchMapToBlocks(mapRows: MapRow[], blocks: McqBlock[]): Map<number, McqBlock> {
  const result = new Map<number, McqBlock>();

  // Pass 1: trailing item numbers on blocks
  for (const block of blocks) {
    for (const num of block.trailingItemNums) {
      if (mapRows.some((r) => r.itemNum === num) && !result.has(num)) {
        result.set(num, block);
      }
    }
  }

  // Pass 2: sequential match for remaining
  const unmatchedMap = mapRows.filter((r) => !result.has(r.itemNum));
  const unmatchedBlocks = blocks.filter(
    (b) => !blockUsed(b, result),
  );

  for (let i = 0; i < unmatchedMap.length && i < unmatchedBlocks.length; i++) {
    result.set(unmatchedMap[i].itemNum, unmatchedBlocks[i]);
  }

  return result;
}

function blockUsed(block: McqBlock, result: Map<number, McqBlock>): boolean {
  for (const b of result.values()) {
    if (b === block) return true;
  }
  return false;
}

export function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
