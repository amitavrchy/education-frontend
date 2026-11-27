import type { Bilingual, ContentLanguage, GroupCode, LevelCode, Timestamps } from "./common";
import type { AccountStatus, UserRole } from "@/types/user";

// ---------------------------------------------------------------- Accounts

export interface UserAccount extends Timestamps {
  /** Two-step verification: a one-time code after the password. */
  twoFactor?: boolean;
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl?: string;
  institutionId?: string;
  guardianIds: string[];
  studentIds: string[];
  planCode?: string;
  lastActiveAt?: string;
  supportTickets: { id: string; subject: string; status: "open" | "resolved"; at: string; category?: string; message?: string }[];
  onboarded: boolean;
  /** Seeded demo accounts. */
  demo?: true;
}

/** Student academic profile collected by onboarding (§6). */
export interface StudentProfile extends Timestamps {
  id: string; // userId
  name: string;
  grade: number;
  levelCode: LevelCode;
  boardId: string;
  group: GroupCode;
  version: ContentLanguage;
  academicYear: string;
  curriculumVersionId: string;
  examYear: number;
  institutionId?: string;
  institutionName?: string;
  subjectIds: string[];
  optionalSubjectIds: string[];
  targetGpa: number;
  weakSubjectIds: string[];
  weakChapterIds: string[];
  dailyMinutes: number;
  preferredTime: "early_morning" | "morning" | "afternoon" | "evening" | "night";
  studyDays: number[];
  targetExamDate: string;
  preferredLanguage: ContentLanguage | "mixed";
  learningPreferences: {
    style: ("visual" | "reading" | "practice" | "audio" | "discussion")[];
    explanationDepth: "brief" | "balanced" | "detailed";
    tutorMode: string;
  };
  aiPreferences: { showSources: boolean; socraticByDefault: boolean; saveHistory: boolean; integrityReminders: boolean };
  voicePreferences: { voiceId: string; speed: number; language: "bn" | "en" | "mixed"; handsFree: boolean };
  notificationPreferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
    types: Record<string, boolean>;
    quietHours: { from: string; to: string } | null;
  };
  privacy: {
    shareProgressWithGuardian: boolean;
    shareScoresWithGuardian: boolean;
    shareConversationsWithGuardian: boolean;
    showOnLeaderboard: boolean;
    dataRetentionMonths: number;
  };
  guardian?: { id: string; name: string; relation: string };
  age?: number;
}

// ---------------------------------------------------------------- Institutions

export interface Institution extends Timestamps {
  id: string;
  name: Bilingual;
  type: "school" | "college" | "school_and_college";
  /** Synthetic identifier — not a real EIIN. */
  code: string;
  district: string;
  division: string;
  boardId: string;
  established: number;
  address: string;
  contactEmail: string;
  contactPhone: string;
  principal: string;
  logoColor: string;
  planCode: string;
  onboardingStep: number;
  onboardingComplete: boolean;
  privacy: {
    shareAggregatesWithPlatform: boolean;
    allowPublicPapers: boolean;
    studentDirectoryVisible: boolean;
    dataRetentionMonths: number;
  };
  studentCount: number;
  teacherCount: number;
  verified: boolean;
}

export interface AcademicSession {
  id: string;
  institutionId: string;
  name: string;
  startDate: string;
  endDate: string;
  terms: { name: string; start: string; end: string }[];
  current: boolean;
}

export interface ClassGroup {
  id: string;
  institutionId: string;
  grade: number;
  section: string;
  group: GroupCode;
  sessionId: string;
  classTeacherId?: string;
  subjectIds: string[];
  studentIds: string[];
  room?: string;
}

export interface InstitutionMember extends Timestamps {
  id: string;
  institutionId: string;
  kind: "teacher" | "student";
  name: string;
  email: string;
  phone?: string;
  /** Linked platform account (synthetic). */
  userId?: string;
  classGroupIds: string[];
  subjectIds: string[];
  rollNo?: string;
  designation?: string;
  status: "active" | "invited" | "inactive";
  /** Aggregates for institution dashboards (students only). */
  stats?: { avgScore: number; attendance: number; studyMinutesWeek: number; examsTaken: number };
}

export interface Assignment extends Timestamps {
  id: string;
  title: string;
  instructions: string;
  subjectId: string;
  chapterId?: string;
  institutionId?: string;
  teacherId: string;
  teacherName: string;
  classGroupIds: string[];
  studentIds: string[];
  dueAt: string;
  totalMarks: number;
  status: "draft" | "assigned" | "closed";
  attachments: { name: string; sizeKb: number }[];
  linkedExamId?: string;
}

export interface Submission extends Timestamps {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt?: string;
  status: "pending" | "submitted" | "late" | "graded" | "returned";
  content: string;
  attachments: { name: string; sizeKb: number }[];
  marks?: number;
  feedback?: string;
  gradedBy?: string;
}

export interface Announcement extends Timestamps {
  id: string;
  institutionId: string;
  title: string;
  body: string;
  audience: "all" | "students" | "teachers" | "guardians" | "class";
  classGroupIds: string[];
  pinned: boolean;
  status: "draft" | "published" | "scheduled";
  publishAt?: string;
  author: string;
}

export interface InstitutionResource extends Timestamps {
  id: string;
  institutionId: string;
  title: string;
  kind: "pdf" | "slide" | "video_link" | "worksheet" | "image";
  subjectId?: string;
  grade?: number;
  sizeKb: number;
  visibility: "students" | "teachers" | "all";
  uploadedBy: string;
  downloads: number;
}

// ---------------------------------------------------------------- Guardian

export interface GuardianLink {
  id: string;
  guardianId: string;
  studentId: string;
  studentName: string;
  relation: string;
  status: "pending" | "active" | "revoked";
  /** What the student/consent policy lets this guardian see. AI conversations default to private. */
  permissions: {
    progress: boolean;
    scores: boolean;
    studyTime: boolean;
    calendar: boolean;
    teacherFeedback: boolean;
    aiConversations: boolean;
  };
  code?: string;
  linkedAt?: string;
}

export interface TeacherFeedback {
  id: string;
  studentId: string;
  teacherName: string;
  subjectId: string;
  text: string;
  kind: "praise" | "concern" | "suggestion";
  at: string;
  acknowledged: boolean;
}

// ---------------------------------------------------------------- Teachers & reviewers (admin)

export interface TeacherProfile extends Timestamps {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "teacher" | "content_reviewer";
  subjectIds: string[];
  institutionId?: string;
  status: "active" | "invited" | "suspended";
  queueSize: number;
  reviewsCompleted: number;
  approvalRate: number;
  avgTurnaroundHours: number;
  qualityScore: number;
  qualityFeedback: { at: string; by: string; note: string; rating: number }[];
  invitedAt?: string;
}
