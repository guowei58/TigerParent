export type ExplanationStep = {
  number: number;
  body: string;
};

const STEP_MARKER = "<<STEP>>";

/** Strip markdown bold and extra whitespace from step bodies. */
function cleanStepBody(body: string): string {
  return body
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function injectStepMarkers(text: string): string {
  let t = text;
  t = t.replace(/(?:^|\s)Step\s+(\d{1,2})\s*[:.)]\s*/gi, `\n${STEP_MARKER}$1\n`);
  t = t.replace(/(?:^|(?<=[.!?])\s+)(\d{1,2})\.\s+/g, `\n${STEP_MARKER}$1\n`);
  return t;
}

/**
 * Parse AI explanations into numbered steps regardless of "Step 3:", "3.", or inline "1. … 2. …".
 */
export function parseExplanationSteps(raw: string): ExplanationStep[] {
  const text = raw.trim().replace(/^Why:\s*/i, "");
  if (!text) return [];

  const marked = injectStepMarkers(text);
  const segments = marked.split(new RegExp(`${STEP_MARKER}(\\d{1,2})\\n`));

  const steps: ExplanationStep[] = [];
  for (let i = 1; i < segments.length; i += 2) {
    const body = segments[i + 1]?.trim();
    if (body) {
      steps.push({ number: steps.length + 1, body: cleanStepBody(body) });
    }
  }

  if (steps.length >= 2) return steps;

  return [{ number: 1, body: cleanStepBody(text) }];
}

/** Canonical storage/display string: one step per paragraph, uniform "1." labels. */
export function normalizeExplanationText(raw: string): string {
  const steps = parseExplanationSteps(raw);
  if (steps.length <= 1) return steps[0]?.body ?? raw.trim();

  return steps.map((s, i) => `${i + 1}. ${s.body}`).join("\n\n");
}

/** Split step body into main text and bullet sub-lines (- A. …). */
export function stepBodyLines(body: string): { main: string; bullets: string[] } {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    const bulletInline = body.split(/\s+-\s+(?=[A-D][.)]\s)/i);
    if (bulletInline.length > 1) {
      return {
        main: bulletInline[0]!.trim(),
        bullets: bulletInline.slice(1).map((b) => b.trim()),
      };
    }
    return { main: body, bullets: [] };
  }
  const bullets: string[] = [];
  const mainParts: string[] = [];
  for (const line of lines) {
    if (/^-\s+/.test(line)) bullets.push(line.replace(/^-\s+/, ""));
    else mainParts.push(line);
  }
  return { main: mainParts.join(" "), bullets };
}
