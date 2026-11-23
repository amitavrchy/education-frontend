import type { Actor, Bilingual, ContentStatus, Timestamps } from "./common";
import type { PortalKey, UserRole } from "@/types/user";

// ---------------------------------------------------------------- Notifications

export const NOTIFICATION_TYPES = [
  "study_reminder",
  "upcoming_exam",
  "revision_reminder",
  "new_assignment",
  "exam_result",
  "teacher_feedback",
  "subscription",
  "payment",
  "curriculum_update",
  "board_announcement",
  "content_correction",
  "system",
  "achievement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: string;
  portal: PortalKey;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
  href?: string;
  priority: "low" | "normal" | "high";
}

export interface Notice {
  id: string;
  title: Bilingual;
  body: Bilingual;
  source: string;
  verified: boolean;
  category: "exam" | "admission" | "holiday" | "result" | "general";
  publishedAt: string;
  /** Demo notices are synthetic; never shown as official announcements. */
  synthetic: true;
}

// ---------------------------------------------------------------- Billing

export type PlanCode = "free" | "pro" | "family" | "institution";

export interface PlanLimits {
  aiMessagesPerDay: number;
  voiceMinutesPerMonth: number;
  photoSolvesPerDay: number;
  offlineDownloads: number;
  members: number;
  handwritingEvaluationsPerMonth: number;
}

export interface Plan extends Timestamps {
  id: string;
  code: PlanCode;
  name: Bilingual;
  description: Bilingual;
  priceMonthly: number;
  priceYearly: number;
  features: Bilingual[];
  limits: PlanLimits;
  trialDays: number;
  active: boolean;
  highlighted: boolean;
}

export interface Subscription extends Timestamps {
  id: string;
  userId: string;
  userName: string;
  planCode: PlanCode;
  status: "active" | "trialing" | "past_due" | "cancelled" | "pending_payment";
  cycle: "monthly" | "yearly";
  startedAt: string;
  renewsAt: string;
  cancelAt?: string;
  trialEndsAt?: string;
  couponCode?: string;
  amount: number;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  subscriptionId?: string;
  planCode: PlanCode;
  amount: number;
  method: "bkash_mock" | "nagad_mock" | "card_mock" | "bank_mock";
  status: "success" | "failed" | "pending" | "refunded";
  invoiceNo: string;
  createdAt: string;
  failureReason?: string;
}

export interface Coupon extends Timestamps {
  id: string;
  code: string;
  description: string;
  percentOff?: number;
  amountOff?: number;
  planCodes: PlanCode[];
  validUntil: string;
  maxRedemptions: number;
  redeemed: number;
  active: boolean;
}

export interface RefundRequest extends Timestamps {
  id: string;
  paymentId: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  status: "requested" | "approved" | "rejected" | "processed";
}

export interface UsageMeter {
  id: string; // userId
  aiMessagesToday: number;
  voiceMinutesThisMonth: number;
  photoSolvesToday: number;
  handwritingThisMonth: number;
  date: string;
}

// ---------------------------------------------------------------- Review workflow

export type ReviewContentType =
  | "question"
  | "chapter"
  | "book"
  | "board_paper"
  | "institution_paper"
  | "ai_answer"
  | "rubric"
  | "note";

export interface ReviewItem extends Timestamps {
  id: string;
  contentType: ReviewContentType;
  contentId: string;
  title: string;
  subjectId?: string;
  status: ContentStatus;
  priority: "low" | "normal" | "high" | "urgent";
  submittedBy: Actor;
  assignedTo?: Actor;
  dueAt?: string;
  /** Snapshot shown to reviewers (markdown). */
  preview: string;
  comments: { id: string; author: Actor; text: string; at: string }[];
  suggestions: { id: string; field: string; from: string; to: string; by: Actor; at: string; state: "open" | "accepted" | "rejected" }[];
  history: { at: string; from: ContentStatus | null; to: ContentStatus; by: Actor; note?: string }[];
}

export interface Rubric extends Timestamps {
  id: string;
  name: string;
  subjectId?: string;
  appliesTo: "creative" | "descriptive" | "handwriting" | "essay" | "speaking";
  criteria: { criterion: string; marks: number; description: string }[];
  status: ContentStatus;
  owner: string;
}

// ---------------------------------------------------------------- Admin: ingestion, KB, audit, moderation

export const INGESTION_STAGES = [
  "upload",
  "validate",
  "extract",
  "ocr",
  "map_chapters",
  "chunk",
  "embed",
  "index",
  "quality_check",
  "review",
  "publish",
] as const;
export type IngestionStage = (typeof INGESTION_STAGES)[number];

export interface IngestionJob extends Timestamps {
  id: string;
  bookId: string;
  bookTitle: string;
  fileName: string;
  fileSizeKb: number;
  stage: IngestionStage;
  stageStatus: "pending" | "running" | "succeeded" | "failed" | "waiting_review";
  progress: number;
  stages: { stage: IngestionStage; status: "pending" | "running" | "succeeded" | "failed" | "skipped" | "waiting_review"; startedAt?: string; finishedAt?: string; message?: string }[];
  logs: { at: string; level: "info" | "warn" | "error"; message: string }[];
  /** Forces a failure at this stage (seeded demo of the error path). */
  failAt?: IngestionStage;
  chunkCount: number;
  pagesProcessed: number;
}

export interface KbCollection {
  id: string;
  name: string;
  kind: "subject" | "curriculum" | "document";
  subjectId?: string;
  curriculumVersionId?: string;
  documentCount: number;
  chunkCount: number;
  status: "ready" | "indexing" | "stale" | "failed";
  updatedAt: string;
}

export interface PromptTemplate extends Timestamps {
  id: string;
  name: string;
  mode: string;
  version: number;
  body: string;
  status: "draft" | "active" | "archived";
  history: { version: number; body: string; at: string; by: string; note: string }[];
}

export interface AiSettings {
  id: "ai-settings";
  models: { id: string; label: string; provider: string; temperature: number; maxTokens: number; enabled: boolean }[];
  routing: { id: string; condition: string; modelId: string; priority: number }[];
  policy: {
    minConfidenceToAnswer: number;
    requireCitationsForVerified: boolean;
    blockOutdatedCurriculum: boolean;
    maxAnswerWords: number;
    ageAppropriateFilter: boolean;
    integrityMode: "remind" | "restrict_homework" | "off";
  };
  modeSettings: Record<string, { enabled: boolean; maxTurns: number; sourceRequired: boolean }>;
  version: number;
  history: { version: number; at: string; by: string; note: string; snapshot: string }[];
}

export interface AiLogEntry {
  id: string;
  at: string;
  kind: "error" | "failed_retrieval" | "low_confidence" | "source_mismatch" | "feedback_negative";
  subjectId?: string;
  query: string;
  detail: string;
  status: "open" | "investigating" | "resolved";
  tokens?: number;
}

export interface EvalDataset {
  id: string;
  name: string;
  subjectId?: string;
  size: number;
  lastRunAt?: string;
  accuracy?: number;
  groundedRate?: number;
  runs: { at: string; accuracy: number; groundedRate: number; promptVersion: number }[];
}

export interface AuditLog {
  id: string;
  at: string;
  actor: Actor;
  category: "content" | "account" | "security" | "billing" | "system" | "ai";
  action: string;
  target: { type: string; id: string; label: string };
  details?: string;
  ip: string;
}

export interface ModerationCase extends Timestamps {
  id: string;
  kind: "user_report" | "ai_response" | "content_error" | "ocr_error" | "sensitive_content" | "institution_paper";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "dismissed";
  reporter: string;
  subject: string;
  excerpt: string;
  reason: string;
  assignee?: string;
  resolution?: string;
  refHref?: string;
}

export interface PrivacyRequest extends Timestamps {
  id: string;
  userId: string;
  userName: string;
  type: "data_export" | "account_deletion" | "consent_withdrawal" | "correction";
  status: "received" | "verifying" | "in_progress" | "completed" | "rejected";
  dueAt: string;
  note?: string;
}

export interface ConsentRecord extends Timestamps {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string;
  guardianContact: string;
  method: "otp" | "email" | "institution";
  status: "pending" | "granted" | "withdrawn" | "rejected";
  scope: string[];
}

export interface SecurityAlert {
  id: string;
  at: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  acknowledged: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  device: string;
  location: string;
  startedAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface ApiKeySetting {
  id: string;
  name: string;
  provider: string;
  /** Placeholders only — real secrets never live in the frontend. */
  maskedValue: string;
  environment: "development" | "staging" | "production";
  lastRotatedAt: string;
}

export interface SystemConfig {
  id: "system";
  maintenanceMode: boolean;
  signupsEnabled: boolean;
  defaultLocale: "bn" | "en";
  minAgeWithoutConsent: number;
  maxUploadMb: number;
  featureFlags: Record<string, boolean>;
}
