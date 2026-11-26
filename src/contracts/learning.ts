import type {
  Bilingual,
  ContentLanguage,
  ContentStatus,
  LevelCode,
  Provenance,
  Timestamps,
  VerificationStatus,
} from "./common";

// ---------------------------------------------------------------- Textbooks

export interface BookChapterRef {
  id: string;
  title: Bilingual;
  startPage: number;
  endPage: number;
  chapterId?: string;
}

export interface BookLicense {
  type: "synthetic_demo" | "open_license" | "publisher_license" | "unknown";
  holder: string;
  downloadAllowed: boolean;
  printAllowed: boolean;
  note: string;
}

export interface Book extends Timestamps {
  id: string;
  title: Bilingual;
  subjectId: string;
  levelCode: LevelCode;
  grades: number[];
  curriculumVersionId: string;
  language: ContentLanguage;
  academicYear: string;
  publicationYear: number;
  publisher: string;
  edition: string;
  isLatestEdition: boolean;
  license: BookLicense;
  provenance: Provenance;
  coverColor: string;
  pageCount: number;
  chapters: BookChapterRef[];
  /** Generated sample PDF in /public/samples (English-version demo books only). */
  pdfUrl?: string;
  status: ContentStatus;
  ingestionJobId?: string;
  reviewerId?: string;
  offlineEligible: boolean;
}

export interface BookPage {
  id: string;
  bookId: string;
  pageNumber: number;
  chapterRefId: string;
  heading?: string;
  /** Markdown + LaTeX body of the synthetic page. */
  body: string;
}

export interface ReadingState {
  id: string; // bookId
  bookId: string;
  lastPage: number;
  pagesRead: number[];
  bookmarks: number[];
  highlights: { id: string; page: number; text: string; color: "yellow" | "green" | "blue"; createdAt: string }[];
  pageNotes: { id: string; page: number; text: string; createdAt: string }[];
  zoom: number;
  updatedAt: string;
}

// ---------------------------------------------------------------- Knowledge base (mock RAG)

export interface SourcePassage {
  id: string;
  documentId: string;
  subjectId: string;
  chapterId: string;
  topicId?: string;
  bookTitle: string;
  chapterTitle: string;
  page: number;
  text: string;
  keywords: string[];
  curriculumVersionId: string;
  language: ContentLanguage;
  verification: VerificationStatus;
  embeddingStatus: "pending" | "embedded" | "failed";
  tokenCount: number;
}

// ---------------------------------------------------------------- AI tutor

export const TEACHING_MODES = [
  "simple",
  "socratic",
  "board",
  "revision",
  "stepwise",
  "deep",
  "practice",
  "oral",
  "formula",
  "english",
] as const;
export type TeachingMode = (typeof TEACHING_MODES)[number];

export interface TutorContext {
  levelCode: LevelCode;
  grade: number;
  subjectId?: string;
  paperId?: string;
  chapterId?: string;
  topicId?: string;
  curriculumVersionId: string;
  language: ContentLanguage | "mixed";
  mode: TeachingMode;
}

export type Grounding = "verified" | "partial" | "general" | "unavailable";

export type AnswerWarning =
  | "low_confidence"
  | "missing_kb"
  | "conflicting_sources"
  | "old_curriculum"
  | "integrity"
  | "safety";

export interface Citation {
  id: string;
  passageId: string;
  bookTitle: string;
  chapterTitle: string;
  page: number;
  excerpt: string;
  /** Substring of excerpt to highlight in the source viewer. */
  highlight: string;
  curriculumVersionId: string;
  verification: VerificationStatus;
  score: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  editedAt?: string;
  status: "complete" | "error";
  mode?: TeachingMode;
  citations: Citation[];
  grounding?: Grounding;
  confidence?: number;
  followUps: string[];
  relatedQuestionIds: string[];
  warnings: AnswerWarning[];
  feedback?: "up" | "down";
  bookmarked?: boolean;
  reported?: boolean;
  teacherReviewRequested?: boolean;
  corrections?: { at: string; by: string; note: string }[];
  /** Always true in this build: answers come from the local mock engine. */
  simulated: boolean;
  /** Practice/oral modes: the question the tutor is waiting on. */
  pendingCheck?: { questionId?: string; prompt: string; expected: string; options?: string[] };
}

export interface Conversation extends Timestamps {
  id: string;
  title: string;
  context: TutorContext;
  folderId?: string;
  pinned: boolean;
  archived: boolean;
  messageCount: number;
  lastMessagePreview: string;
  share: { enabled: boolean; linkId?: string; includeName: boolean };
}

export interface ConversationFolder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// ---------------------------------------------------------------- Voice

export type VoiceLanguage = "bn" | "en" | "mixed";

export interface VoiceTurn {
  id: string;
  speaker: "student" | "ai";
  text: string;
  at: string;
  /** Where the text came from — never presented as production speech recognition. */
  origin: "device_speech" | "demo_script" | "typed" | "mock_ai";
}

export interface VoiceSession {
  id: string;
  title: string;
  mode: "tutor" | "oral_exam";
  language: VoiceLanguage;
  voiceId: string;
  subjectId?: string;
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  turns: VoiceTurn[];
  saved: boolean;
  summary?: string;
}

export interface VoiceQuota {
  minutesUsed: number;
  minutesLimit: number;
  periodLabel: string;
}

// ---------------------------------------------------------------- OCR / photo solver

export interface OcrJob {
  id: string;
  fileName: string;
  fixtureId?: string;
  status: "uploaded" | "processing" | "extracted" | "unreadable" | "unsupported" | "solved";
  extractedText: string;
  correctedText?: string;
  detectedSubjectId?: string;
  chapterId?: string;
  confidence: number;
  solution?: { steps: string[]; answer: string; explanation: string };
  createdAt: string;
}

// ---------------------------------------------------------------- Audio revision

export interface AudioLesson {
  id: string;
  title: Bilingual;
  kind: "chapter_lesson" | "revision_podcast" | "generated";
  subjectId: string;
  chapterId?: string;
  language: ContentLanguage;
  durationSec: number;
  /** Transcript segments; playback uses the device's speech synthesis — no AI provider. */
  segments: { id: string; startSec: number; title: string; text: string }[];
  createdAt: string;
}

export interface AudioProgress {
  id: string; // lessonId
  lessonId: string;
  positionSec: number;
  completed: boolean;
  favorite: boolean;
  downloaded: boolean;
  lastPlayedAt?: string;
}

// ---------------------------------------------------------------- Book avatar teachers

/** Visual configuration for the 2D teacher avatar (rendered as SVG). */
export interface AvatarAppearance {
  gender: "female" | "male";
  skinTone: string;
  hairStyle: "short" | "side_part" | "long" | "bun" | "hijab" | "bald";
  hairColor: string;
  outfit: "saree" | "salwar" | "shirt" | "panjabi" | "blazer";
  outfitColor: string;
  accentColor: string;
  glasses: boolean;
  beard: boolean;
  background: string;
}

/** One live teacher avatar per book. Answers strictly from that book's content. */
export interface BookAvatar extends Timestamps {
  id: string;
  bookId: string;
  name: Bilingual;
  title: Bilingual;
  appearance: AvatarAppearance;
  voice: { language: "bn" | "en"; rate: number; pitch: number; voiceURI?: string };
  greeting: Bilingual;
  persona: { style: "friendly" | "formal" | "socratic"; answerLength: "short" | "balanced" | "detailed"; useExamples: boolean };
  /** Empty = the whole book. */
  scopeChapterIds: string[];
  /** When true the avatar refuses questions outside the book. */
  strictBookScope: boolean;
  status: "draft" | "active" | "disabled";
  stats: { sessions: number; questions: number; outOfScope: number; helpful: number; notHelpful: number };
}

export interface AvatarCitation {
  page: number;
  chapterTitle: string;
  heading?: string;
  excerpt: string;
}

export interface AvatarMessage {
  id: string;
  sessionId: string;
  role: "student" | "avatar";
  text: string;
  /** Plain text the avatar speaks (no Markdown/LaTeX). */
  spoken?: string;
  inputMode?: "text" | "voice";
  at: string;
  citations: AvatarCitation[];
  grounded?: "book" | "greeting" | "out_of_scope";
  followUps: string[];
  feedback?: "up" | "down";
  flagged?: boolean;
  /** Always true in this build — answers come from the local mock engine. */
  simulated: boolean;
}

export interface AvatarSession {
  id: string;
  bookId: string;
  avatarId: string;
  studentId: string;
  title: string;
  startedAt: string;
  lastAt: string;
  messageCount: number;
  voiceTurns: number;
  minutes: number;
}

/** Student-flagged avatar answers, reviewed by teachers/content managers. */
export interface AvatarReport extends Timestamps {
  id: string;
  bookId: string;
  avatarId: string;
  studentId: string;
  question: string;
  answer: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  resolution?: string;
  resolvedBy?: string;
}
