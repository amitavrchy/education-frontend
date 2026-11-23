import type { Bilingual, ContentStatus, Difficulty, ExamRelevance, GroupCode, LevelCode } from "./common";

export interface EducationLevel {
  id: string;
  code: LevelCode;
  name: Bilingual;
  /** Class numbers covered, e.g. [9, 10]. */
  grades: number[];
  order: number;
  active: boolean;
}

export interface CurriculumVersion {
  id: string;
  name: string;
  /** Year the syllabus came into force. */
  effectiveYear: number;
  status: "draft" | "active" | "archived";
  levelCodes: LevelCode[];
  notes?: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface ExamYear {
  id: string;
  year: number;
  levelCode: LevelCode;
  /** Planned/typical exam month; purely informational. */
  expectedMonth: string;
  status: "upcoming" | "completed";
}

export interface Board {
  id: string;
  code: string;
  name: Bilingual;
  category: "general" | "madrasah" | "technical";
  active: boolean;
}

export interface AcademicGroup {
  id: string;
  code: GroupCode;
  name: Bilingual;
  levelCodes: LevelCode[];
}

export interface ClassLevel {
  id: string;
  grade: number;
  levelCode: LevelCode;
  name: Bilingual;
}

/** Icon keys map to lucide icons + illustration colours in the UI (see subject-visuals.ts). */
export type SubjectIcon =
  | "physics"
  | "chemistry"
  | "biology"
  | "math"
  | "higher-math"
  | "bangla"
  | "english"
  | "ict"
  | "accounting"
  | "finance"
  | "economics"
  | "business"
  | "history"
  | "geography"
  | "civics"
  | "global-studies"
  | "religion"
  | "agriculture";

export interface Subject {
  id: string;
  code: string;
  name: Bilingual;
  levelCode: LevelCode;
  groupCodes: GroupCode[];
  curriculumVersionId: string;
  icon: SubjectIcon;
  compulsory: boolean;
  description: Bilingual;
  status: ContentStatus;
}

export interface Paper {
  id: string;
  subjectId: string;
  number: number;
  name: Bilingual;
}

export interface Chapter {
  id: string;
  subjectId: string;
  paperId?: string;
  number: number;
  title: Bilingual;
  description: Bilingual;
  estimatedMinutes: number;
  difficulty: Difficulty;
  /** Chapter ids that should be studied first. */
  prerequisiteIds: string[];
  examRelevance: ExamRelevance;
  status: ContentStatus;
  /** Set when this chapter belongs to an older curriculum version still in use. */
  outdated?: boolean;
}

export interface Topic {
  id: string;
  chapterId: string;
  subjectId: string;
  order: number;
  title: Bilingual;
  verified: boolean;
}

export interface LearningOutcome {
  id: string;
  topicId: string;
  chapterId: string;
  subjectId: string;
  code: string;
  text: Bilingual;
}

export interface CurriculumMigration {
  id: string;
  fromVersionId: string;
  toVersionId: string;
  fromChapterId: string;
  toChapterId?: string;
  change: "renamed" | "merged" | "split" | "removed" | "moved" | "unchanged";
  note: string;
}

export interface CurriculumUpdate {
  id: string;
  versionId: string;
  title: string;
  description: string;
  publishedAt: string;
  affectedSubjectIds: string[];
}
