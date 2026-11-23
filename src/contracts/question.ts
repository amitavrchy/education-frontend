import type { ContentStatus, Difficulty, ExamRelevance, LevelCode, Provenance, Timestamps, VerificationStatus } from "./common";

export const QUESTION_TYPES = [
  "mcq",
  "short",
  "descriptive",
  "creative",
  "numerical",
  "proof",
  "true_false",
  "fill_blank",
  "matching",
  "definition",
  "formula",
  "diagram",
  "case_based",
  "passage",
  "practical",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Objective types are auto-scored locally. Everything else is self/teacher/AI(simulated) graded. */
export const OBJECTIVE_TYPES: QuestionType[] = ["mcq", "true_false", "fill_blank", "matching", "numerical"];

export interface QuestionOption {
  id: string;
  text: string;
}

export interface CqPart {
  label: "ক" | "খ" | "গ" | "ঘ";
  level: "knowledge" | "comprehension" | "application" | "higher_order";
  prompt: string;
  answer: string;
  marks: number;
}

export interface RubricCriterion {
  criterion: string;
  marks: number;
  description?: string;
}

export interface SolutionMethod {
  title: string;
  steps: string[];
}

export interface QuestionSource {
  kind: "board" | "institution" | "textbook" | "teacher" | "synthetic";
  /** Human label, e.g. "Synthetic sample · Dhaka-style 2023". */
  label: string;
  boardId?: string;
  year?: number;
  institutionId?: string;
  paperId?: string;
  bookId?: string;
  page?: number;
}

/**
 * Question body fields are Markdown with $inline$ / $$block$$ LaTeX.
 * Diagrams are inline SVG strings authored for the demo (with required alt text).
 */
export interface Question extends Timestamps {
  id: string;
  type: QuestionType;
  levelCode: LevelCode;
  subjectId: string;
  chapterId: string;
  topicId?: string;
  outcomeId?: string;
  stem: string;
  passage?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  /** True/false key. */
  correctBoolean?: boolean;
  /** Accepted answers per blank (case-insensitive). */
  blanks?: string[][];
  matchingPairs?: { left: string; right: string }[];
  /** Numerical answer with tolerance. */
  numericAnswer?: { value: number; unit?: string; tolerance: number };
  cqParts?: CqPart[];
  answer: string;
  explanation: string;
  steps?: string[];
  methods?: SolutionMethod[];
  rubric?: RubricCriterion[];
  diagram?: { svg: string; alt: string };
  marks: number;
  difficulty: Difficulty;
  source: QuestionSource;
  provenance: Provenance;
  verification: VerificationStatus;
  examRelevance: ExamRelevance;
  /** How many (synthetic) papers this concept appeared in — drives "sort by frequency". */
  frequency: number;
  tags: string[];
  status: ContentStatus;
  version: number;
  versions?: { version: number; at: string; by: string; summary: string }[];
  reviewerId?: string;
  /** Set by duplicate detection (admin import / institution papers). */
  duplicateOfId?: string;
}

export interface QuestionAttempt {
  id: string;
  questionId: string;
  subjectId: string;
  chapterId: string;
  topicId?: string;
  correct: boolean;
  source: "practice" | "exam" | "daily_quiz" | "board_practice" | "flashcard";
  answeredAt: string;
  timeSpentSec?: number;
}

export interface PracticeSet {
  id: string;
  name: string;
  questionIds: string[];
  createdAt: string;
  updatedAt: string;
  kind: "manual" | "incorrect" | "photo_solver" | "board" | "institution";
}

export interface Bookmark {
  id: string;
  kind: "question" | "board_paper" | "institution_paper" | "tutor_answer" | "book_page" | "note" | "audio";
  refId: string;
  title: string;
  subtitle?: string;
  href: string;
  createdAt: string;
}

export interface ContentReport {
  id: string;
  kind: "question" | "ai_answer" | "ocr" | "book" | "institution_paper" | "board_paper" | "other";
  refId: string;
  reason: string;
  details?: string;
  reporterId: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  createdAt: string;
}
