import { generateProblemExplanationWithPipeline } from "@/lib/ai/explanationPipeline";

export type ExplanationInput = {
  /** Full problem text (prefer rawText from PDF extraction). */
  cleanedText: string;
  choices: { label: string; text: string | null }[];
  correctChoiceLabel: string | null;
  correctAnswerText: string | null;
  gradeLevel: number;
  subject: string;
  conceptName?: string;
  /** DB path to problem or full-page crop — enables vision explanations. */
  problemImagePath?: string | null;
  /** Reading passage text for ELA items linked to a shared passage. */
  passageText?: string | null;
};

export type ExplanationOutput = {
  correctChoiceLabel: string | null;
  correctAnswerText: string;
  explanationShort: string;
  explanationStepByStep: string;
  childFriendlyExplanation: string;
  commonMistakes: string[];
  prerequisiteSkills: string[];
  estimatedTimeSeconds: number;
  confidence: number;
  warnings: string[];
};

export {
  generateKeyAnchoredExplanation,
  generateProblemExplanation,
} from "@/lib/ai/explanationFallback";

export async function generateProblemExplanationWithAi(
  input: ExplanationInput,
): Promise<ExplanationOutput & { modelUsed: string }> {
  return generateProblemExplanationWithPipeline(input);
}
