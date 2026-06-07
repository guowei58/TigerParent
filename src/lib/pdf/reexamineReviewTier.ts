import type { DualModelResolution } from "@/lib/ai/dualModelReexamine";

export type ReexamineReviewTier = "confident" | "questionable";

const TIER_PREFIX = "reexamine-tier:";

export function classifyReexamineReviewTier(input: {
  resolution: DualModelResolution;
  confidence: number;
  answerChanged: boolean;
  documentKeyFound: boolean;
  claudeUnavailableReason?: string | null;
}): { tier: ReexamineReviewTier; reason: string } {
  if (input.resolution === "arbitrated") {
    return {
      tier: "questionable",
      reason: "ChatGPT and Claude disagreed — answer was arbitrated",
    };
  }

  if (input.resolution === "openai-only" || input.resolution === "claude-only") {
    const detail =
      input.resolution === "openai-only" && input.claudeUnavailableReason
        ? input.claudeUnavailableReason
        : input.resolution === "openai-only"
          ? "Claude unavailable"
          : "ChatGPT unavailable";
    return {
      tier: "questionable",
      reason:
        input.resolution === "openai-only"
          ? `Only ChatGPT ran (${detail})`
          : `Only Claude ran (${detail})`,
    };
  }

  if (input.confidence < 0.7) {
    return {
      tier: "questionable",
      reason: `Low model confidence (${Math.round(input.confidence * 100)}%)`,
    };
  }

  if (input.documentKeyFound && input.answerChanged) {
    return {
      tier: "questionable",
      reason: "Dual-model answer differs from document answer key",
    };
  }

  if (input.resolution === "consensus") {
    if (input.documentKeyFound && !input.answerChanged) {
      return {
        tier: "confident",
        reason: "ChatGPT and Claude agreed; matches document key",
      };
    }
    return {
      tier: "confident",
      reason: "ChatGPT and Claude agreed",
    };
  }

  return {
    tier: "questionable",
    reason: "Unable to classify — please review",
  };
}

export function mergeReexamineTierWarning(
  existing: unknown,
  tier: ReexamineReviewTier,
  reason: string,
): string[] {
  const base = Array.isArray(existing)
    ? (existing as string[]).filter((w) => !String(w).startsWith(TIER_PREFIX))
    : [];
  return [...base, `${TIER_PREFIX}${tier}:${reason}`];
}

export function parseReexamineReviewTier(parseWarnings: unknown): {
  tier: ReexamineReviewTier | null;
  reason: string | null;
} {
  if (!Array.isArray(parseWarnings)) return { tier: null, reason: null };

  for (const entry of parseWarnings) {
    const text = String(entry);
    if (!text.startsWith(TIER_PREFIX)) continue;
    const body = text.slice(TIER_PREFIX.length);
    const colon = body.indexOf(":");
    if (colon === -1) continue;
    const tier = body.slice(0, colon) as ReexamineReviewTier;
    if (tier !== "confident" && tier !== "questionable") continue;
    return { tier, reason: body.slice(colon + 1) };
  }

  return { tier: null, reason: null };
}

export function reexamineTierLabel(tier: ReexamineReviewTier): string {
  return tier === "confident" ? "Likely correct" : "Needs review";
}
