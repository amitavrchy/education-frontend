import type { GuardianLink, Institution, InstitutionMember, StudentProfile, TeacherFeedback, TeacherProfile, UserAccount } from "@/contracts";
import type { User, UserRole } from "@/types";
import { CURRENT_VERSION_ID } from "./curriculum";
import { bi, dateKey, daysFromNow, rng } from "./utils";

/** All people below are fictional demo records. */

export const DEMO_STUDENT_ID = "u-student-1";
export const DEMO_INSTITUTION_ID = "inst-1";

export const demoUsers: Record<UserRole, User> = {
  student: { id: DEMO_STUDENT_ID, name: "রাফি আহমেদ", email: "student@shikkha.ai", phone: "01711000001", role: "student", academicLevel: "SSC 2027", institutionId: DEMO_INSTITUTION_ID, onboarded: true, createdAt: "2026-01-10T08:00:00.000Z" },
  parent: { id: "u-parent-1", name: "করিম উদ্দিন", email: "parent@shikkha.ai", phone: "01711000002", role: "parent", createdAt: "2026-02-20T08:00:00.000Z" },
  teacher: { id: "u-teacher-1", name: "নাসরিন সুলতানা", email: "teacher@shikkha.ai", role: "teacher", institutionId: DEMO_INSTITUTION_ID, createdAt: "2025-09-01T08:00:00.000Z" },
  content_reviewer: { id: "u-reviewer-1", name: "ড. মাহমুদ হাসান", email: "reviewer@shikkha.ai", role: "content_reviewer", createdAt: "2025-08-01T08:00:00.000Z" },
  content_manager: { id: "u-cm-1", name: "তানজিলা রহমান", email: "content@shikkha.ai", role: "content_manager", createdAt: "2025-05-01T08:00:00.000Z" },
  school_admin: { id: "u-school-1", name: "মো. আবদুল কাদের", email: "school@shikkha.ai", role: "school_admin", institutionId: DEMO_INSTITUTION_ID, createdAt: "2025-06-15T08:00:00.000Z" },
  college_admin: { id: "u-college-1", name: "ফারহানা ইসলাম", email: "college@shikkha.ai", role: "college_admin", institutionId: "inst-2", createdAt: "2025-06-20T08:00:00.000Z" },
  support: { id: "u-support-1", name: "সাকিব হোসেন", email: "support@shikkha.ai", role: "support", createdAt: "2025-04-01T08:00:00.000Z" },
  platform_admin: { id: "u-padmin-1", name: "নুসরাত জাহান", email: "admin@shikkha.ai", role: "platform_admin", createdAt: "2025-01-01T08:00:00.000Z" },
  super_admin: { id: "u-sadmin-1", name: "সিস্টেম সুপার অ্যাডমিন", email: "super@shikkha.ai", role: "super_admin", createdAt: "2025-01-01T08:00:00.000Z" },
};

export const institutions: Institution[] = [
  ["inst-1", "আইডিয়াল মডেল হাই স্কুল (ডেমো)", "Ideal Model High School (demo)", "school", "Dhaka", "Dhaka", "brd-dhaka", 1985, "#0f766e"],
  ["inst-2", "নবদিগন্ত কলেজ (ডেমো)", "Nobodigonto College (demo)", "college", "Chattogram", "Chattogram", "brd-chattogram", 1994, "#7c3aed"],
  ["inst-3", "সূর্যোদয় স্কুল অ্যান্ড কলেজ (ডেমো)", "Suryoday School & College (demo)", "school_and_college", "Rajshahi", "Rajshahi", "brd-rajshahi", 2001, "#b45309"],
  ["inst-4", "মেঘনা বালিকা বিদ্যালয় (ডেমো)", "Meghna Girls' School (demo)", "school", "Cumilla", "Chattogram", "brd-cumilla", 1972, "#be185d"],
  ["inst-5", "সুরমা সরকারি কলেজ (ডেমো)", "Surma College (demo)", "college", "Sylhet", "Sylhet", "brd-sylhet", 1968, "#1d4ed8"],
  ["inst-6", "তিস্তা আদর্শ বিদ্যানিকেতন (ডেমো)", "Teesta Adarsha Bidyaniketan (demo)", "school", "Rangpur", "Rangpur", "brd-dinajpur", 1990, "#15803d"],
].map(([id, bn, en, type, district, division, boardId, established, color], i) => ({
  id: id as string,
  name: bi(bn as string, en as string),
  type: type as Institution["type"],
  code: `DEMO-${100200 + i * 37}`,
  district: district as string,
  division: division as string,
  boardId: boardId as string,
  established: established as number,
  address: `${district}, Bangladesh (fictional address)`,
  contactEmail: `office${i + 1}@demo-institution.test`,
  contactPhone: `0170000${String(1000 + i)}`,
  principal: ["প্রধান শিক্ষক (ডেমো)", "অধ্যক্ষ (ডেমো)"][i % 2],
  logoColor: color as string,
  planCode: i < 3 ? "institution" : "free",
  onboardingStep: i === 0 ? 4 : 2,
  onboardingComplete: i !== 3,
  privacy: { shareAggregatesWithPlatform: true, allowPublicPapers: i % 2 === 0, studentDirectoryVisible: false, dataRetentionMonths: 24 },
  studentCount: 420 + i * 133,
  teacherCount: 24 + i * 5,
  verified: i !== 3,
  createdAt: "2025-06-15T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z",
}));

const firstNames = ["রাফি", "নাবিলা", "তাহসিন", "সামিয়া", "আরিফ", "মেহজাবিন", "ইমরান", "তাসনিম", "সাদিয়া", "রিয়াদ", "ফাহিম", "জান্নাতুল", "নাফিস", "রুবাইয়া", "শাহরিয়ার", "আদিবা", "তানভীর", "ইশরাত", "মাহির", "নুসাইবা"];
const lastNames = ["আহমেদ", "রহমান", "হোসেন", "ইসলাম", "চৌধুরী", "খান", "সরকার", "দাস", "মিয়া", "বিশ্বাস"];

const r = rng("users");
const roleList: UserRole[] = ["student", "student", "student", "student", "student", "parent", "parent", "teacher", "content_reviewer", "student"];

export const userAccounts: UserAccount[] = [
  ...Object.values(demoUsers).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: "active" as const,
    institutionId: u.institutionId,
    guardianIds: u.role === "student" ? ["u-parent-1"] : [],
    studentIds: u.role === "parent" ? [DEMO_STUDENT_ID, "u-student-2"] : [],
    planCode: u.role === "student" ? "pro" : u.role === "parent" ? "family" : undefined,
    lastActiveAt: daysFromNow(0, 8),
    consent: u.role === "student" ? ("granted" as const) : ("not_required" as const),
    supportTickets: u.role === "student" ? [{ id: "tk-1", subject: "ভয়েস টিউটর মাইক্রোফোন কাজ করছে না", status: "resolved" as const, at: daysFromNow(-20) }] : [],
    onboarded: true,
    demo: true as const,
    createdAt: u.createdAt,
    updatedAt: u.createdAt,
  })),
  ...Array.from({ length: 64 }, (_, i) => {
    const role = roleList[i % roleList.length];
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 7) % lastNames.length]}`;
    const status = i % 23 === 5 ? "suspended" : i % 31 === 7 ? "pending_deletion" : i % 17 === 3 ? "invited" : "active";
    return {
      id: `u-gen-${i + 2}`,
      name,
      email: `demo.user${i + 2}@example.test`,
      phone: `0181${String(2000000 + i * 4111).slice(0, 7)}`,
      role,
      status: status as UserAccount["status"],
      institutionId: institutions[i % institutions.length].id,
      guardianIds: role === "student" && i % 3 === 0 ? ["u-parent-1"] : [],
      studentIds: [],
      planCode: r.pick(["free", "free", "pro", "family"]),
      lastActiveAt: daysFromNow(-r.int(0, 40), r.int(7, 22)),
      consent: role === "student" ? (r.pick(["granted", "granted", "pending", "withdrawn"]) as UserAccount["consent"]) : "not_required",
      supportTickets: i % 9 === 0 ? [{ id: `tk-${i}`, subject: "পেমেন্ট নিশ্চিতকরণ পাইনি", status: "open" as const, at: daysFromNow(-r.int(1, 10)) }] : [],
      onboarded: i % 11 !== 0,
      demo: true as const,
      createdAt: daysFromNow(-r.int(10, 300)),
      updatedAt: daysFromNow(-r.int(0, 9)),
    } satisfies UserAccount;
  }),
];

/** Fix u-student-2 as the second linked child. */
userAccounts.push({
  ...userAccounts.find((u) => u.id === DEMO_STUDENT_ID)!,
  id: "u-student-2",
  name: "নাবিলা আহমেদ",
  email: "nabila@shikkha.ai",
  phone: "01711000011",
  planCode: "family",
});

export function defaultStudentProfile(user: Pick<User, "id" | "name">): StudentProfile {
  return {
    id: user.id,
    name: user.name,
    grade: 10,
    levelCode: "SSC",
    boardId: "brd-dhaka",
    group: "science",
    version: "bn",
    academicYear: "2026",
    curriculumVersionId: CURRENT_VERSION_ID,
    examYear: 2027,
    institutionId: DEMO_INSTITUTION_ID,
    institutionName: "আইডিয়াল মডেল হাই স্কুল (ডেমো)",
    subjectIds: ["ssc-physics", "ssc-chemistry", "ssc-biology", "ssc-math", "ssc-bangla-1", "ssc-bangla-2", "ssc-english-1", "ssc-english-2", "ssc-ict"],
    optionalSubjectIds: ["ssc-higher-math"],
    targetGpa: 5,
    weakSubjectIds: ["ssc-chemistry", "ssc-higher-math"],
    weakChapterIds: ["ssc-chemistry-c6", "ssc-physics-c3"],
    dailyMinutes: 180,
    preferredTime: "evening",
    studyDays: [0, 1, 2, 3, 4, 6],
    targetExamDate: `${2027}-02-15`,
    preferredLanguage: "bn",
    learningPreferences: { style: ["visual", "practice"], explanationDepth: "balanced", tutorMode: "simple" },
    aiPreferences: { showSources: true, socraticByDefault: false, saveHistory: true, integrityReminders: true },
    voicePreferences: { voiceId: "bn-female-1", speed: 1, language: "mixed", handsFree: false },
    notificationPreferences: {
      push: true,
      email: true,
      sms: false,
      types: { study_reminder: true, upcoming_exam: true, revision_reminder: true, new_assignment: true, exam_result: true, teacher_feedback: true, subscription: true, payment: true, curriculum_update: true, board_announcement: true, content_correction: true, system: true, achievement: true },
      quietHours: { from: "22:30", to: "06:30" },
    },
    privacy: { shareProgressWithGuardian: true, shareScoresWithGuardian: true, shareConversationsWithGuardian: false, shareWithInstitution: true, showOnLeaderboard: true, dataRetentionMonths: 24 },
    guardian: { id: "u-parent-1", name: "করিম উদ্দিন", relation: "বাবা", consent: "granted" },
    age: 15,
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T08:00:00.000Z",
  };
}

export const studentProfiles: StudentProfile[] = [
  defaultStudentProfile(demoUsers.student),
  { ...defaultStudentProfile({ id: "u-student-2", name: "নাবিলা আহমেদ" }), grade: 12, levelCode: "HSC", group: "business", examYear: 2027, subjectIds: ["hsc-accounting", "hsc-finance", "hsc-economics", "hsc-bangla", "hsc-english", "hsc-ict"], optionalSubjectIds: [], weakSubjectIds: ["hsc-finance"], weakChapterIds: ["hsc-finance-c3"] },
];

export const guardianLinks: GuardianLink[] = [
  { id: "gl-1", guardianId: "u-parent-1", studentId: DEMO_STUDENT_ID, studentName: "রাফি আহমেদ", relation: "বাবা", status: "active", permissions: { progress: true, scores: true, studyTime: true, calendar: true, teacherFeedback: true, aiConversations: false }, linkedAt: "2026-02-21T08:00:00.000Z" },
  { id: "gl-2", guardianId: "u-parent-1", studentId: "u-student-2", studentName: "নাবিলা আহমেদ", relation: "বাবা", status: "active", permissions: { progress: true, scores: true, studyTime: false, calendar: true, teacherFeedback: true, aiConversations: false }, linkedAt: "2026-03-02T08:00:00.000Z" },
];

export const teacherFeedback: TeacherFeedback[] = [
  { id: "tf-1", studentId: DEMO_STUDENT_ID, teacherName: "নাসরিন সুলতানা", subjectId: "ssc-physics", text: "গতির সমীকরণে উন্নতি চোখে পড়ার মতো। একক রূপান্তরে আরেকটু মনোযোগ দাও।", kind: "praise", at: daysFromNow(-2), acknowledged: false },
  { id: "tf-2", studentId: DEMO_STUDENT_ID, teacherName: "মো. জাকির হোসেন", subjectId: "ssc-chemistry", text: "মোল সংক্রান্ত গণনায় ভুল হচ্ছে। প্রতিদিন ৫টি করে অঙ্ক অনুশীলন করো।", kind: "concern", at: daysFromNow(-5), acknowledged: true },
  { id: "tf-3", studentId: DEMO_STUDENT_ID, teacherName: "শারমিন আক্তার", subjectId: "ssc-english-2", text: "Narration-এ ভালো করছ। Essay structure-এ topic sentence যোগ করো।", kind: "suggestion", at: daysFromNow(-9), acknowledged: true },
  { id: "tf-4", studentId: "u-student-2", teacherName: "মাহফুজ আলম", subjectId: "hsc-finance", text: "অর্থের সময়মূল্যের ধারণা আরও পরিষ্কার হওয়া প্রয়োজন।", kind: "concern", at: daysFromNow(-3), acknowledged: false },
];

export const teacherProfiles: TeacherProfile[] = [
  ["u-teacher-1", "নাসরিন সুলতানা", "teacher", ["ssc-physics", "ssc-math"]],
  ["u-reviewer-1", "ড. মাহমুদ হাসান", "content_reviewer", ["ssc-physics", "hsc-physics", "ssc-chemistry"]],
  ["u-t-3", "মো. জাকির হোসেন", "teacher", ["ssc-chemistry", "hsc-chemistry"]],
  ["u-t-4", "শারমিন আক্তার", "teacher", ["ssc-english-1", "ssc-english-2", "hsc-english"]],
  ["u-t-5", "মাহফুজ আলম", "content_reviewer", ["hsc-finance", "hsc-accounting", "ssc-accounting"]],
  ["u-t-6", "রেহানা পারভীন", "content_reviewer", ["ssc-bangla-1", "ssc-bangla-2", "hsc-bangla"]],
  ["u-t-7", "সুমন দত্ত", "teacher", ["ssc-ict", "hsc-ict"]],
  ["u-t-8", "লায়লা আরজুমান্দ", "content_reviewer", ["ssc-biology", "hsc-biology"]],
].map(([id, name, role, subjectIds], i) => ({
  id: `tp-${i + 1}`,
  userId: id as string,
  name: name as string,
  email: `${(id as string).replace("u-", "")}@shikkha.ai`,
  role: role as TeacherProfile["role"],
  subjectIds: subjectIds as string[],
  institutionId: i % 3 === 0 ? DEMO_INSTITUTION_ID : undefined,
  status: i === 6 ? "invited" : "active",
  queueSize: [6, 14, 3, 8, 11, 5, 0, 9][i],
  reviewsCompleted: [42, 188, 37, 61, 120, 74, 0, 93][i],
  approvalRate: [0.81, 0.74, 0.88, 0.79, 0.7, 0.85, 0, 0.77][i],
  avgTurnaroundHours: [20, 9, 31, 16, 12, 18, 0, 14][i],
  qualityScore: [4.4, 4.7, 4.1, 4.5, 4.2, 4.6, 0, 4.3][i],
  qualityFeedback: i < 6 ? [{ at: daysFromNow(-14 - i), by: "তানজিলা রহমান", note: "রিভিউ মন্তব্য সুস্পষ্ট ও গঠনমূলক।", rating: 5 - (i % 2) }] : [],
  invitedAt: i === 6 ? daysFromNow(-2) : undefined,
  createdAt: "2025-08-01T08:00:00.000Z",
  updatedAt: daysFromNow(-1),
}));

const mr = rng("members");
export const institutionMembers: InstitutionMember[] = [
  ...teacherProfiles.slice(0, 6).map((t, i) => ({
    id: `im-t-${i + 1}`,
    institutionId: DEMO_INSTITUTION_ID,
    kind: "teacher" as const,
    name: t.name,
    email: t.email,
    userId: t.userId,
    classGroupIds: i < 3 ? ["cg-9a", "cg-10a"] : ["cg-10b"],
    subjectIds: t.subjectIds.filter((s) => s.startsWith("ssc")),
    designation: ["সহকারী শিক্ষক", "সিনিয়র শিক্ষক", "সহকারী প্রধান শিক্ষক"][i % 3],
    status: i === 5 ? ("invited" as const) : ("active" as const),
    createdAt: "2025-09-01T08:00:00.000Z",
    updatedAt: daysFromNow(-3),
  })),
  ...Array.from({ length: 48 }, (_, i) => {
    const group = ["cg-9a", "cg-10a", "cg-10b"][i % 3];
    return {
      id: `im-s-${i + 1}`,
      institutionId: DEMO_INSTITUTION_ID,
      kind: "student" as const,
      name: i === 0 ? "রাফি আহমেদ" : `${firstNames[(i + 3) % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`,
      email: `student${i + 1}@demo-school.test`,
      userId: i === 0 ? DEMO_STUDENT_ID : undefined,
      classGroupIds: [i === 0 ? "cg-10a" : group],
      subjectIds: [],
      rollNo: String(i + 1).padStart(2, "0"),
      status: "active" as const,
      stats: { avgScore: mr.int(48, 96), attendance: mr.int(70, 99), studyMinutesWeek: mr.int(90, 900), examsTaken: mr.int(1, 14) },
      createdAt: "2026-01-05T08:00:00.000Z",
      updatedAt: daysFromNow(-mr.int(0, 6)),
    };
  }),
];

export const today = () => dateKey(0);
