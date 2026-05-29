export type ParsedChoice = {
  label: string;
  text: string | null;
  sortOrder: number;
};

export function parseAnswerChoices(rawText: string): ParsedChoice[] {
  const choices: ParsedChoice[] = [];
  const blockRe =
    /\n([A-D])[\.\)]\s*([\s\S]+?)(?=\n[A-D][\.\)]|\nID#|\n\d{1,3}[\.\uFFFD\u2022\t ]|$)/gi;
  let m: RegExpExecArray | null;
  let order = 0;
  while ((m = blockRe.exec(rawText)) !== null) {
    const text = m[2]!.replace(/\s+/g, " ").trim().slice(0, 500) || null;
    choices.push({ label: m[1]!.toUpperCase(), text, sortOrder: order++ });
  }
  return choices;
}
