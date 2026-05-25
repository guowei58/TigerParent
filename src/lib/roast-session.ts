import { prisma } from "./db";
import { pickTigerParentRoast, type RoastUsage } from "./tiger-parent-roasts";

type PhaseJson = Record<string, unknown> & {
  roastUsage?: RoastUsage;
};

export async function pickRoastForSession(
  sessionId: string,
  isCorrect: boolean,
): Promise<string> {
  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    select: { phaseJson: true },
  });

  const phaseData = (practiceSession?.phaseJson ?? {}) as PhaseJson;
  const { roast, usage } = pickTigerParentRoast(isCorrect, phaseData.roastUsage);

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      phaseJson: {
        ...phaseData,
        roastUsage: usage,
      },
    },
  });

  return roast;
}
