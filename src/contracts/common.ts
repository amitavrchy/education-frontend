/** Content that exists in both UI languages. */
export interface Bilingual {
  bn: string;
  en: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/** Editorial workflow used by every reviewable content type (master prompt §28). */
export const CONTENT_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "changes_requested",
  "approved",
  "published",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Allowed transitions — enforced by reviewService, rendered by the status flow UI. */
export const CONTENT_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["in_review", "draft"],
  in_review: ["changes_requested", "approved"],
  changes_requested: ["submitted", "archived"],
  approved: ["published", "changes_requested"],
  published: ["archived"],
  archived: ["draft"],
};

export type VerificationStatus = "verified" | "partially_verified" | "unverified" | "disputed";

export type Difficulty = "easy" | "medium" | "hard";

/**
 * Where a piece of content comes from. In this demo everything academic is `synthetic_sample`
 * or user-generated; nothing is presented as an official/real source.
 */
export type Provenance = "synthetic_sample" | "licensed_sample" | "teacher_uploaded" | "institution_uploaded" | "user_generated";

export type LevelCode = "SSC" | "HSC";
export type GroupCode = "science" | "business" | "humanities" | "common";
export type ContentLanguage = "bn" | "en";

export interface Actor {
  id: string;
  name: string;
  role: string;
}

export type ExamRelevance = "high" | "medium" | "low";
