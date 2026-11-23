import type { Timestamps } from "./common";

// ---------------------------------------------------------------- Study planner

export type TaskType = "study" | "revision" | "practice" | "exam_prep" | "reading" | "assignment";
export type TaskStatus = "scheduled" | "in_progress" | "completed" | "missed";

export interface StudyTask extends Timestamps {
  id: string;
  title: string;
  subjectId?: string;
  chapterId?: string;
  type: TaskType;
  /** YYYY-MM-DD (Asia/Dhaka). */
  date: string;
  /** HH:mm */
  start: string;
  durationMinutes: number;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  notes?: string;
  reminder: boolean;
  source: "generated" | "manual" | "recommendation" | "teacher";
  completedAt?: string;
  reflection?: { rating: 1 | 2 | 3 | 4 | 5; note?: string; actualMinutes: number };
  rescheduledFrom?: string;
}

export interface StudyPlanSettings {
  id: "settings";
  targetGpa: number;
  dailyMinutes: number;
  preferredTime: "early_morning" | "morning" | "afternoon" | "evening" | "night";
  studyDays: number[];
  examDate: string;
  subjectPriority: Record<string, number>;
  chapterPriority: Record<string, number>;
  remindersEnabled: boolean;
  generatedAt?: string;
}

export interface StudyGoal {
  id: string;
  title: string;
  metric: "minutes" | "chapters" | "questions" | "exams";
  target: number;
  current: number;
  period: "daily" | "weekly" | "monthly";
  dueDate?: string;
  createdAt: string;
}

// ---------------------------------------------------------------- Progress & mastery

export interface ChapterProgress {
  id: string; // chapterId
  chapterId: string;
  subjectId: string;
  status: "not_started" | "in_progress" | "completed";
  percent: number;
  topicsCompleted: string[];
  lastStudiedAt?: string;
  completedAt?: string;
  history: { at: string; action: "started" | "resumed" | "topic_done" | "completed" | "reset" }[];
}

export interface TopicMastery {
  id: string; // topicId
  topicId: string;
  chapterId: string;
  subjectId: string;
  attempts: number;
  correct: number;
  /** 0–100, exponentially weighted towards recent answers. */
  mastery: number;
  lastPracticedAt?: string;
  /** Last 8 mastery snapshots for trend sparklines. */
  trend: number[];
  mistakes: Record<string, number>;
}

export interface ActivityEntry {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  kind: "study" | "practice" | "exam" | "tutor" | "voice" | "reading" | "flashcards" | "audio" | "notes";
  label: string;
  xp: number;
  at: string;
}

// ---------------------------------------------------------------- Flashcards

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  subjectId?: string;
  chapterId?: string;
  source: "manual" | "chapter" | "notes" | "conversation" | "incorrect" | "ai" | "english_vocab";
  color: string;
  offline: boolean;
  createdAt: string;
}

export interface Flashcard extends Timestamps {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  tags: string[];
  bookmarked: boolean;
  /** SM-2-lite scheduling state. */
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt?: string;
  lastRating?: "again" | "hard" | "medium" | "easy";
  known?: boolean;
}

// ---------------------------------------------------------------- Notes

export type NoteKind =
  | "short"
  | "detailed"
  | "revision"
  | "formula"
  | "definition"
  | "takeaways"
  | "important_questions"
  | "custom";

export interface Note extends Timestamps {
  id: string;
  title: string;
  /** Sanitised HTML produced by the Tiptap editor. */
  content: string;
  kind: NoteKind;
  folderId?: string;
  tags: string[];
  favorite: boolean;
  linkedNoteIds: string[];
  source: {
    type: "manual" | "chapter" | "topic" | "question" | "conversation" | "upload" | "photo_solver" | "voice" | "book_page";
    refId?: string;
    label?: string;
  };
  subjectId?: string;
  chapterId?: string;
  offline: boolean;
  versions: { at: string; title: string; content: string }[];
}

export interface NoteFolder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// ---------------------------------------------------------------- Gamification

export interface BadgeDefinition {
  id: string;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
  icon: string;
  tier: "bronze" | "silver" | "gold";
}

export interface GamificationState {
  id: "me";
  xp: number;
  points: number;
  streak: { current: number; longest: number; lastActiveDate?: string; freezeAvailable: number };
  badges: { id: string; earnedAt: string }[];
  missionProgress: Record<string, number>;
  claimedMissions: string[];
  history: { id: string; at: string; label: string; xp: number }[];
  friendChallenges: { id: string; friend: string; title: string; status: "active" | "won" | "lost" | "pending"; myScore: number; theirScore: number }[];
}

// ---------------------------------------------------------------- Offline

export interface OfflineItem {
  id: string;
  kind: "book" | "notes" | "flashcards" | "quiz" | "audio" | "chapter";
  refId: string;
  title: string;
  sizeMb: number;
  version: string;
  latestVersion: string;
  status: "queued" | "downloading" | "downloaded" | "failed" | "outdated";
  progress: number;
  downloadedAt?: string;
  sync: "synced" | "pending" | "conflict";
  conflict?: { localUpdatedAt: string; remoteUpdatedAt: string; summary: string };
}
