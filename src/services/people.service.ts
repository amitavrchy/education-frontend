import type {
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
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { usersRepo } from "./auth.service";

export const profilesRepo = createMockRepository<StudentProfile>({ collection: "studentProfiles", seed: () => studentProfiles, searchFields: ["name"] });
export const guardianLinksRepo = createMockRepository<GuardianLink>({ collection: "guardianLinks", seed: () => guardianLinks, timestamps: false });
export const teacherFeedbackRepo = createMockRepository<TeacherFeedback>({ collection: "teacherFeedback", seed: () => teacherFeedback, timestamps: false, defaultSort: { sortBy: "at", sortOrder: "desc" } });
export const teacherProfilesRepo = createMockRepository<TeacherProfile>({ collection: "teacherProfiles", seed: () => teacherProfiles, searchFields: ["name", "email"] });
export const institutionsRepo = createMockRepository<Institution>({ collection: "institutions", seed: () => institutions, searchFields: ["name.bn", "name.en", "code", "district"] });
export const membersRepo = createMockRepository<InstitutionMember>({ collection: "institutionMembers", seed: () => institutionMembers, searchFields: ["name", "email", "rollNo"] });

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
