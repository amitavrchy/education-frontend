import type { Actor, Bilingual, Difficulty, LevelCode, Provenance, Timestamps } from "./common";
import type { QuestionType } from "./question";

// ---------------------------------------------------------------- Exams

export const EXAM_KINDS = [
  "chapter",
  "topic",
  "subject",
  "full_syllabus",
  "model_test",
  "board_previous",
  "daily_challenge",
  "adaptive",
  "custom",
  "institution",
  "teacher_assigned",
  "mixed",
  "oral",
] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export type ExamStatus = "draft" | "scheduled" | "published" | "closed" | "archived";

export interface Exam extends Timestamps {
  id: string;
  title: string;
  kind: ExamKind;
  levelCode: LevelCode;
  subjectId?: string;
  chapterIds: string[];
  topicIds: string[];
  questionIds: string[];
  questionTypes: QuestionType[];
  difficulty: Difficulty | "mixed";
  durationMinutes: number;
  totalMarks: number;
  /** Marks deducted per wrong objective answer (0 = none). */
  negativeMarking: number;
  mode: "practice" | "exam";
  randomize: boolean;
  reviewPolicy: "immediate" | "after_submit" | "after_publish";
  status: ExamStatus;
  scheduledAt?: string;
  closesAt?: string;
  createdBy: Actor;
  institutionId?: string;
  /** Class group / student ids for assigned exams. */
  assignedTo?: string[];
  instructions: string[];
  passPercent: number;
  templateId?: string;
  resultsPublished: boolean;
  /** For board_previous kind. */
  boardPaperId?: string;
}

export interface ExamTemplate {
  id: string;
  name: Bilingual;
  kind: ExamKind;
  description: Bilingual;
  levelCode: LevelCode;
  durationMinutes: number;
  totalMarks: number;
  questionTypes: QuestionType[];
  negativeMarking: number;
  sections: { title: string; type: QuestionType; count: number; marksEach: number }[];
}

export interface AttemptAnswer {
  optionId?: string;
  booleanValue?: boolean;
  text?: string;
  blanks?: string[];
  matches?: Record<string, string>;
  numeric?: number;
  uploadNames?: string[];
}

export interface QuestionResult {
  questionId: string;
  type: QuestionType;
  topicId?: string;
  chapterId: string;
  difficulty: Difficulty;
  status: "correct" | "incorrect" | "unanswered" | "pending_review" | "partial";
  awarded: number;
  max: number;
  /** For descriptive answers: simulated AI estimate, explicitly non-authoritative. */
  aiEstimate?: { marks: number; feedback: string };
  timeSpentSec?: number;
}

export interface ExamResult {
  score: number;
  total: number;
  percent: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  pendingReview: number;
  accuracy: number;
  timeSpentSec: number;
  negativeDeducted: number;
  passed: boolean;
  grade: string;
  questions: QuestionResult[];
  byTopic: { topicId: string; chapterId: string; correct: number; total: number }[];
  byDifficulty: Record<Difficulty, { correct: number; total: number }>;
  weakTopicIds: string[];
  recommendedChapterIds: string[];
  containsSimulatedGrading: boolean;
  teacherFeedback?: { by: string; text: string; at: string };
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  /** Question order for this attempt (after randomisation). */
  questionOrder: string[];
  startedAt: string;
  submittedAt?: string;
  status: "in_progress" | "submitted" | "expired";
  answers: Record<string, AttemptAnswer>;
  markedForReview: string[];
  currentIndex: number;
  remainingSec: number;
  lastSavedAt: string;
  timePerQuestion: Record<string, number>;
  result?: ExamResult;
}

// ---------------------------------------------------------------- Handwriting evaluation

export type EvaluationStage =
  | "uploaded"
  | "processing"
  | "ai_estimated"
  | "teacher_review_requested"
  | "teacher_reviewed"
  | "official";

export interface EvaluationPage {
  id: string;
  name: string;
  /** Downscaled preview data URL (or seeded SVG data URL). */
  preview: string;
  rotation: number;
  crop?: { top: number; right: number; bottom: number; left: number };
}

export interface RubricScore {
  criterion: string;
  max: number;
  ai: number;
  teacher?: number;
  comment?: string;
}

export interface HandwritingEvaluation extends Timestamps {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  subjectId: string;
  questionId?: string;
  questionText: string;
  modelAnswer: string;
  pages: EvaluationPage[];
  ocrText: string;
  correctedText?: string;
  stage: EvaluationStage;
  rubric: RubricScore[];
  maxMarks: number;
  aiMarks?: number;
  teacherMarks?: number;
  officialMarks?: number;
  dimensions?: { concept: number; calculation: number; presentation: number };
  missingPoints: string[];
  suggestions: string[];
  teacherComment?: string;
  reviewerName?: string;
  previousAttemptId?: string;
}

// ---------------------------------------------------------------- Board archive

export interface BoardPaper {
  id: string;
  levelCode: LevelCode;
  boardId: string;
  year: number;
  subjectId: string;
  paperNumber: number;
  curriculumVersionId: string;
  examType: "mcq" | "creative" | "full";
  title: string;
  durationMinutes: number;
  totalMarks: number;
  questionIds: string[];
  solved: boolean;
  provenance: Provenance;
  authenticity: {
    status: "synthetic_sample" | "verified_transcript" | "scan_only" | "unverified";
    originalSource: string;
    scanAvailable: boolean;
    transcriptVerified: boolean;
    permission: "demo_only" | "licensed" | "public_domain" | "unknown";
  };
  syllabusVersionLabel: string;
  status: "draft" | "in_review" | "published";
  relevanceWarning?: string;
}

// ---------------------------------------------------------------- Institution papers

export const INSTITUTION_EXAM_CATEGORIES = [
  "annual",
  "half_yearly",
  "pre_test",
  "test",
  "selection_test",
  "terminal",
  "class_test",
  "model_test",
  "custom",
] as const;
export type InstitutionExamCategory = (typeof INSTITUTION_EXAM_CATEGORIES)[number];

export interface InstitutionPaper extends Timestamps {
  id: string;
  institutionId: string;
  title: string;
  academicYear: string;
  grade: number;
  levelCode: LevelCode;
  subjectId: string;
  category: InstitutionExamCategory;
  visibility: "public" | "private";
  uploadedBy: Actor;
  questionIds: string[];
  /** Seeded scan rendering (SVG data URLs). */
  scanPages: string[];
  extractedText: string;
  verifiedSolutions: boolean;
  duplicateOfId?: string;
  license: "granted" | "pending" | "denied";
  moderation: "pending" | "approved" | "rejected";
  moderationNote?: string;
  provenance: Provenance;
  reportCount: number;
}
