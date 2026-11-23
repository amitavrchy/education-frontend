import type {
  ConsentRecord,
  GuardianLink,
  Institution,
  InstitutionMember,
  PrivacyRequest,
  StudentProfile,
  TeacherFeedback,
  TeacherProfile,
} from "@/contracts";
import { daysFromNow } from "@/mock-data/utils";
import {
  defaultStudentProfile,
  guardianLinks,
  institutionMembers,
  institutions,
  studentProfiles,
  teacherFeedback,
  teacherProfiles,
} from "@/mock-data/users";
import { createMockRepository } from "./core/repository";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { usersRepo } from "./auth.service";

export const profilesRepo = createMockRepository<StudentProfile>({ collection: "studentProfiles", seed: () => studentProfiles, searchFields: ["name"] });
export const guardianLinksRepo = createMockRepository<GuardianLink>({ collection: "guardianLinks", seed: () => guardianLinks, timestamps: false });
export const teacherFeedbackRepo = createMockRepository<TeacherFeedback>({ collection: "teacherFeedback", seed: () => teacherFeedback, timestamps: false, defaultSort: { sortBy: "at", sortOrder: "desc" } });
export const teacherProfilesRepo = createMockRepository<TeacherProfile>({ collection: "teacherProfiles", seed: () => teacherProfiles, searchFields: ["name", "email"] });
export const institutionsRepo = createMockRepository<Institution>({ collection: "institutions", seed: () => institutions, searchFields: ["name.bn", "name.en", "code", "district"] });
export const membersRepo = createMockRepository<InstitutionMember>({ collection: "institutionMembers", seed: () => institutionMembers, searchFields: ["name", "email", "rollNo"] });

const consentSeed = (): ConsentRecord[] => [
  { id: "cr-1", studentId: "u-student-1", studentName: "রাফি আহমেদ", guardianName: "করিম উদ্দিন", guardianContact: "01711000002", method: "otp", status: "granted", scope: ["progress", "scores", "notifications"], createdAt: daysFromNow(-280), updatedAt: daysFromNow(-280) },
  { id: "cr-2", studentId: "u-gen-4", studentName: "তাহসিন হোসেন", guardianName: "অভিভাবক (ডেমো)", guardianContact: "01810000004", method: "otp", status: "pending", scope: ["progress"], createdAt: daysFromNow(-3), updatedAt: daysFromNow(-3) },
  { id: "cr-3", studentId: "u-gen-12", studentName: "ফাহিম ইসলাম", guardianName: "অভিভাবক (ডেমো)", guardianContact: "guardian12@example.test", method: "email", status: "withdrawn", scope: ["progress", "scores"], createdAt: daysFromNow(-90), updatedAt: daysFromNow(-10) },
  { id: "cr-4", studentId: "u-gen-22", studentName: "নুসাইবা খান", guardianName: "অভিভাবক (ডেমো)", guardianContact: "01810000022", method: "institution", status: "granted", scope: ["progress", "scores", "institution"], createdAt: daysFromNow(-40), updatedAt: daysFromNow(-40) },
];
export const consentRepo = createMockRepository<ConsentRecord>({ collection: "consentRecords", seed: consentSeed, searchFields: ["studentName", "guardianName", "guardianContact"], defaultSort: { sortBy: "updatedAt", sortOrder: "desc" } });

const privacySeed = (): PrivacyRequest[] => [
  { id: "pr-1", userId: "u-gen-7", userName: "আরিফ চৌধুরী", type: "data_export", status: "in_progress", dueAt: daysFromNow(12), createdAt: daysFromNow(-2), updatedAt: daysFromNow(-1) },
  { id: "pr-2", userId: "u-gen-31", userName: "সাদিয়া সরকার", type: "account_deletion", status: "verifying", dueAt: daysFromNow(25), createdAt: daysFromNow(-5), updatedAt: daysFromNow(-5) },
  { id: "pr-3", userId: "u-gen-13", userName: "জান্নাতুল দাস", type: "consent_withdrawal", status: "completed", dueAt: daysFromNow(-3), note: "Guardian sharing disabled.", createdAt: daysFromNow(-20), updatedAt: daysFromNow(-4) },
  { id: "pr-4", userId: "u-gen-40", userName: "ইমরান মিয়া", type: "correction", status: "received", dueAt: daysFromNow(28), createdAt: daysFromNow(-1), updatedAt: daysFromNow(-1) },
];
export const privacyRequestsRepo = createMockRepository<PrivacyRequest>({ collection: "privacyRequests", seed: privacySeed, searchFields: ["userName", "type"], defaultSort: { sortBy: "createdAt", sortOrder: "desc" } });

export const profileService = {
  /** Profile for a student; created from defaults on first access (e.g. a freshly registered account). */
  async get(userId: string, name = ""): Promise<StudentProfile> {
    await mockRequest(150);
    const existing = await profilesRepo.find(userId);
    if (existing) return existing;
    return { ...defaultStudentProfile({ id: userId, name }), subjectIds: [], weakSubjectIds: [], weakChapterIds: [], guardian: undefined };
  },
  async save(profile: StudentProfile): Promise<StudentProfile> {
    const exists = await profilesRepo.find(profile.id);
    const stamped = { ...profile, updatedAt: nowIso() };
    if (exists) return profilesRepo.update(profile.id, stamped);
    return profilesRepo.create({ ...stamped, createdAt: nowIso() });
  },
  async update(userId: string, patch: Partial<StudentProfile>) {
    return profilesRepo.update(userId, patch);
  },
};

export const consentService = {
  async requestGuardianConsent(input: { studentId: string; studentName: string; guardianName: string; guardianContact: string; relation: string; scope: string[] }) {
    await mockRequest(400);
    const record = await consentRepo.create({
      id: newId("cr"),
      studentId: input.studentId,
      studentName: input.studentName,
      guardianName: input.guardianName,
      guardianContact: input.guardianContact,
      method: input.guardianContact.includes("@") ? "email" : "otp",
      status: "pending",
      scope: input.scope,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    return record;
  },
  /** Guardian confirms with the OTP they received (demo code 123456). */
  async confirm(recordId: string, code: string, relation: string) {
    await mockRequest(400);
    if (code !== "123456") invalid("OTP_INVALID", { code: ["OTP_INVALID"] });
    const record = await consentRepo.update(recordId, { status: "granted" });
    await usersRepo.update(record.studentId, { consent: "granted" });
    const profile = await profilesRepo.find(record.studentId);
    if (profile) await profilesRepo.update(record.studentId, { guardian: { id: "pending-guardian", name: record.guardianName, relation, consent: "granted" } });
    return record;
  },
  async withdraw(studentId: string) {
    await mockRequest(300);
    const records = (await consentRepo.raw()).filter((r) => r.studentId === studentId && r.status === "granted");
    await consentRepo.bulkUpdate(records.map((r) => r.id), { status: "withdrawn" });
    await usersRepo.update(studentId, { consent: "withdrawn" });
  },
  async latestFor(studentId: string) {
    return (await consentRepo.all({ studentId }))[0];
  },
};

export const privacyService = {
  async request(userId: string, userName: string, type: PrivacyRequest["type"], note?: string) {
    await mockRequest(300);
    if (type === "account_deletion") await usersRepo.update(userId, { status: "pending_deletion" });
    return privacyRequestsRepo.create({ id: newId("pr"), userId, userName, type, status: "received", dueAt: daysFromNow(30), note, createdAt: nowIso(), updatedAt: nowIso() });
  },
  async cancelDeletion(userId: string) {
    await mockRequest(300);
    const open = (await privacyRequestsRepo.raw()).filter((r) => r.userId === userId && r.type === "account_deletion" && r.status !== "completed");
    await privacyRequestsRepo.bulkUpdate(open.map((r) => r.id), { status: "rejected", note: "Cancelled by user" });
    await usersRepo.update(userId, { status: "active" });
  },
  mine: (userId: string) => privacyRequestsRepo.all({ userId }),
};
