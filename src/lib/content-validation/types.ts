import type {
  Problem,
  ProblemType,
  ProblemValidationRun,
  ValidationStatus,
  ValidationType,
} from "@/generated/prisma/client";

export type ValidationResult = {
  validationType: ValidationType;
  status: ValidationStatus;
  details: Record<string, unknown>;
  message: string;
};

export type PipelineResult = {
  problemId: string;
  results: ValidationResult[];
  passed: boolean;
  canShowToStudents: boolean;
  recommendedStatus: "NEEDS_REVIEW" | "APPROVED" | "REJECTED";
};

export type ProblemForValidation = Problem & {
  skill: {
    id: string;
    title: string;
    subjectId: string;
    nominalGradeLevel: number;
    subject: { slug: string; name: string };
  };
  standardAlignments: { alignmentStrength: string; standardId: string }[];
  validationRuns?: ProblemValidationRun[];
};

export type GeneratedMathProblem = {
  type: ProblemType;
  prompt: string;
  choicesJson?: string[];
  correctAnswer: string;
  acceptableAnswersJson?: string[];
  explanation: string;
  solutionStepsJson: string[];
  commonMistakeTagsJson: string[];
  misconceptionTagsJson: string[];
  difficulty: number;
  gradeLevel: number;
  targetSeconds: number;
  cognitiveLevel: "RECALL" | "PROCEDURAL" | "APPLICATION" | "MULTI_STEP" | "REASONING" | "CHALLENGE";
  answerValidationMethod: "EXACT" | "NUMERIC_TOLERANCE" | "EXPRESSION_EQUIVALENCE";
  requiresScratchpad?: boolean;
};
