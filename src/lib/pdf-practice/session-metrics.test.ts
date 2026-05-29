import { describe, expect, it } from "vitest";
import {
  countPdfTopicSessions,
  DEFAULT_SECONDS_PER_PDF_PROBLEM,
  estimatePdfPracticeSeconds,
  PDF_SESSION_GAP_MS,
} from "./session-metrics";

describe("countPdfTopicSessions", () => {
  it("groups same concept within gap", () => {
    const t0 = new Date("2026-05-27T10:00:00");
    const t1 = new Date(t0.getTime() + 30 * 60 * 1000);
    expect(
      countPdfTopicSessions([
        { createdAt: t0, conceptId: "a" },
        { createdAt: t1, conceptId: "a" },
      ]),
    ).toBe(1);
  });

  it("splits after gap or concept change", () => {
    const t0 = new Date("2026-05-27T10:00:00");
    const t1 = new Date(t0.getTime() + PDF_SESSION_GAP_MS + 1);
    expect(
      countPdfTopicSessions([
        { createdAt: t0, conceptId: "a" },
        { createdAt: t1, conceptId: "a" },
      ]),
    ).toBe(2);
    expect(
      countPdfTopicSessions([
        { createdAt: t0, conceptId: "a" },
        { createdAt: new Date(t0.getTime() + 1000), conceptId: "b" },
      ]),
    ).toBe(2);
  });
});

describe("estimatePdfPracticeSeconds", () => {
  it("uses per-problem default when timers missing", () => {
    const t = new Date("2026-05-27T10:00:00");
    expect(
      estimatePdfPracticeSeconds([
        { createdAt: t, timeSpentSeconds: null },
        { createdAt: t, timeSpentSeconds: null },
      ]),
    ).toBe(2 * DEFAULT_SECONDS_PER_PDF_PROBLEM);
  });

  it("sums recorded timers", () => {
    const t = new Date("2026-05-27T10:00:00");
    expect(
      estimatePdfPracticeSeconds([
        { createdAt: t, timeSpentSeconds: 120 },
        { createdAt: t, timeSpentSeconds: 45 },
      ]),
    ).toBe(165);
  });
});
