import assert from "node:assert/strict";
import { dualModelAnswersMatch } from "@/lib/ai/dualModelReexamine";
import type { ExplanationOutput } from "@/lib/ai/generateProblemExplanation";

function answer(partial: Partial<ExplanationOutput>): ExplanationOutput {
  return {
    correctChoiceLabel: null,
    correctAnswerText: "",
    explanationShort: "",
    explanationStepByStep: "",
    childFriendlyExplanation: "",
    commonMistakes: [],
    prerequisiteSkills: [],
    estimatedTimeSeconds: 60,
    confidence: 0.9,
    warnings: [],
    ...partial,
  };
}

assert.equal(
  dualModelAnswersMatch(
    answer({ correctChoiceLabel: "D", correctAnswerText: "1/4" }),
    answer({ correctChoiceLabel: "d", correctAnswerText: "one fourth" }),
  ),
  true,
);

assert.equal(
  dualModelAnswersMatch(
    answer({ correctAnswerText: "45" }),
    answer({ correctAnswerText: "45.0" }),
  ),
  true,
);

assert.equal(
  dualModelAnswersMatch(
    answer({ correctChoiceLabel: "A", correctAnswerText: "2" }),
    answer({ correctChoiceLabel: "B", correctAnswerText: "3" }),
  ),
  false,
);

console.log("dualModelAnswersMatch tests passed");
