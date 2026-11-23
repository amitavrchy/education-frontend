import type { AcademicSession, Announcement, Assignment, ClassGroup, InstitutionResource, Submission } from "@/contracts";
import { daysFromNow, rng, SEED_EPOCH } from "@/mock-data/utils";
import { institutionMembers } from "@/mock-data/users";
import { createMockRepository } from "./core/repository";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notificationService } from "./notification.service";
import { institutionsRepo, membersRepo, teacherFeedbackRepo } from "./people.service";

/**
 * School/class data shared by the teacher and institution portals (§28–29). Everything is
 * scoped by institutionId; the demo institution is inst-1.
 */

const seedSessions = (): AcademicSession[] => [
  { id: "ses-2026", institutionId: "inst-1", name: "শিক্ষাবর্ষ ২০২৬", startDate: "2026-01-01", endDate: "2026-12-31", current: true, terms: [{ name: "প্রথম সাময়িক", start: "2026-01-01", end: "2026-04-30" }, { name: "অর্ধবার্ষিক", start: "2026-05-01", end: "2026-08-31" }, { name: "বার্ষিক", start: "2026-09-01", end: "2026-12-31" }] },
  { id: "ses-2025", institutionId: "inst-1", name: "শিক্ষাবর্ষ ২০২৫", startDate: "2025-01-01", endDate: "2025-12-31", current: false, terms: [{ name: "অর্ধবার্ষিক", start: "2025-01-01", end: "2025-06-30" }, { name: "বার্ষিক", start: "2025-07-01", end: "2025-12-31" }] },
];

const studentsIn = (cg: string) => institutionMembers.filter((m) => m.kind === "student" && m.classGroupIds.includes(cg)).map((m) => m.id);
const seedClasses = (): ClassGroup[] => [
  { id: "cg-9a", institutionId: "inst-1", grade: 9, section: "ক", group: "science", sessionId: "ses-2026", classTeacherId: "im-t-2", subjectIds: ["ssc-physics", "ssc-chemistry", "ssc-biology", "ssc-math", "ssc-english-2"], studentIds: studentsIn("cg-9a"), room: "২০৩" },
  { id: "cg-10a", institutionId: "inst-1", grade: 10, section: "ক", group: "science", sessionId: "ses-2026", classTeacherId: "im-t-1", subjectIds: ["ssc-physics", "ssc-chemistry", "ssc-biology", "ssc-math", "ssc-higher-math", "ssc-english-2"], studentIds: studentsIn("cg-10a"), room: "৩০১" },
  { id: "cg-10b", institutionId: "inst-1", grade: 10, section: "খ", group: "business", sessionId: "ses-2026", classTeacherId: "im-t-4", subjectIds: ["ssc-accounting", "ssc-math", "ssc-english-2"], studentIds: studentsIn("cg-10b"), room: "৩০২" },
];

function seedAssignments(): Assignment[] {
  return [
    { id: "as-1", title: "বল অধ্যায়: ৫টি গাণিতিক সমস্যা", instructions: "পাঠ্যবইয়ের অনুশীলনী থেকে ৫টি সমস্যা সমাধান করে খাতার ছবি জমা দাও। একক লিখতে ভুলবে না।", subjectId: "ssc-physics", chapterId: "ssc-physics-c3", institutionId: "inst-1", teacherId: "u-teacher-1", teacherName: "নাসরিন সুলতানা", classGroupIds: ["cg-10a"], studentIds: [], dueAt: daysFromNow(2, 22), totalMarks: 20, status: "assigned", attachments: [{ name: "worksheet-force.pdf", sizeKb: 240 }], createdAt: daysFromNow(-3), updatedAt: daysFromNow(-3) },
    { id: "as-2", title: "দ্বিঘাত সমীকরণ: অনুশীলন সেট", instructions: "১০টি সমীকরণ সমাধান করো এবং যাচাই দেখাও।", subjectId: "ssc-math", chapterId: "ssc-math-c5", institutionId: "inst-1", teacherId: "u-teacher-1", teacherName: "নাসরিন সুলতানা", classGroupIds: ["cg-9a", "cg-10a"], studentIds: [], dueAt: daysFromNow(-1, 22), totalMarks: 10, status: "assigned", attachments: [], createdAt: daysFromNow(-8), updatedAt: daysFromNow(-8) },
    { id: "as-3", title: "Paragraph: Our school library", instructions: "Write a paragraph of 150 words.", subjectId: "ssc-english-2", institutionId: "inst-1", teacherId: "u-t-4", teacherName: "শারমিন আক্তার", classGroupIds: ["cg-10b"], studentIds: [], dueAt: daysFromNow(5, 22), totalMarks: 10, status: "draft", attachments: [], createdAt: daysFromNow(-1), updatedAt: daysFromNow(-1) },
  ];
}

function seedSubmissions(): Submission[] {
  const r = rng("submissions");
  const out: Submission[] = [];
  for (const a of seedAssignments().filter((x) => x.status === "assigned")) {
    const ids = a.classGroupIds.flatMap(studentsIn);
    ids.forEach((sid, i) => {
      const m = institutionMembers.find((x) => x.id === sid)!;
      const submitted = r.bool(0.75);
      const graded = submitted && r.bool(0.5);
      out.push({
        id: `sub-${a.id}-${sid}`,
        assignmentId: a.id,
        studentId: m.userId ?? sid,
        studentName: m.name,
        submittedAt: submitted ? daysFromNow(-r.int(0, 3), r.int(14, 22)) : undefined,
        status: graded ? "graded" : submitted ? (i % 7 === 3 ? "late" : "submitted") : "pending",
        content: submitted ? "উত্তর খাতার ছবি সংযুক্ত। (ডেমো জমা)" : "",
        attachments: submitted ? [{ name: `answer-${i + 1}.jpg`, sizeKb: r.int(300, 1400) }] : [],
        marks: graded ? r.int(Math.round(a.totalMarks * 0.4), a.totalMarks) : undefined,
        feedback: graded ? "ভালো চেষ্টা। ধাপগুলো আরও পরিষ্কার করে লেখো।" : undefined,
        gradedBy: graded ? a.teacherName : undefined,
        createdAt: a.createdAt,
        updatedAt: daysFromNow(-r.int(0, 3)),
      });
    });
  }
  return out;
}

const seedAnnouncements = (): Announcement[] => [
  { id: "an-1", institutionId: "inst-1", title: "অর্ধবার্ষিক পরীক্ষার সময়সূচি প্রকাশ", body: "আগামী মাসের ১০ তারিখ থেকে অর্ধবার্ষিক পরীক্ষা শুরু। বিস্তারিত সময়সূচি নোটিশ বোর্ডে। (ডেমো)", audience: "all", classGroupIds: [], pinned: true, status: "published", author: "প্রধান শিক্ষক (ডেমো)", createdAt: daysFromNow(-2), updatedAt: daysFromNow(-2) },
  { id: "an-2", institutionId: "inst-1", title: "বিজ্ঞান মেলার প্রজেক্ট জমা", body: "দশম শ্রেণির শিক্ষার্থীরা বৃহস্পতিবারের মধ্যে প্রজেক্টের নাম জমা দেবে।", audience: "class", classGroupIds: ["cg-10a", "cg-10b"], pinned: false, status: "published", author: "নাসরিন সুলতানা", createdAt: daysFromNow(-5), updatedAt: daysFromNow(-5) },
  { id: "an-3", institutionId: "inst-1", title: "অভিভাবক সভা", body: "শনিবার সকাল ১০টায় অভিভাবক সভা অনুষ্ঠিত হবে।", audience: "guardians", classGroupIds: [], pinned: false, status: "scheduled", publishAt: daysFromNow(1, 9), author: "প্রধান শিক্ষক (ডেমো)", createdAt: daysFromNow(-1), updatedAt: daysFromNow(-1) },
];

const seedResources = (): InstitutionResource[] => [
  { id: "res-1", institutionId: "inst-1", title: "পদার্থবিজ্ঞান সূত্র শিট (ক্লাস ১০)", kind: "pdf", subjectId: "ssc-physics", grade: 10, sizeKb: 420, visibility: "students", uploadedBy: "নাসরিন সুলতানা", downloads: 134, createdAt: daysFromNow(-20), updatedAt: daysFromNow(-20) },
  { id: "res-2", institutionId: "inst-1", title: "রসায়ন ল্যাব নিরাপত্তা নির্দেশিকা", kind: "pdf", subjectId: "ssc-chemistry", sizeKb: 310, visibility: "all", uploadedBy: "মো. জাকির হোসেন", downloads: 88, createdAt: daysFromNow(-30), updatedAt: daysFromNow(-30) },
  { id: "res-3", institutionId: "inst-1", title: "গণিত: জ্যামিতি স্লাইড", kind: "slide", subjectId: "ssc-math", grade: 9, sizeKb: 2100, visibility: "students", uploadedBy: "নাসরিন সুলতানা", downloads: 57, createdAt: daysFromNow(-12), updatedAt: daysFromNow(-12) },
  { id: "res-4", institutionId: "inst-1", title: "শিক্ষক প্রশিক্ষণ: সৃজনশীল প্রশ্ন প্রণয়ন", kind: "video_link", sizeKb: 1, visibility: "teachers", uploadedBy: "প্রধান শিক্ষক (ডেমো)", downloads: 21, createdAt: daysFromNow(-40), updatedAt: daysFromNow(-40) },
];

export const sessionsRepo = createMockRepository<AcademicSession>({ collection: "academicSessions", seed: seedSessions, timestamps: false, entity: "Session" });
export const classGroupsRepo = createMockRepository<ClassGroup>({ collection: "classGroups", seed: seedClasses, timestamps: false, entity: "Class" });
export const assignmentsRepo = createMockRepository<Assignment>({ collection: "assignments", seed: seedAssignments, searchFields: ["title"], defaultSort: { sortBy: "dueAt", sortOrder: "desc" }, entity: "Assignment" });
export const submissionsRepo = createMockRepository<Submission>({ collection: "submissions", seed: seedSubmissions, searchFields: ["studentName"], entity: "Submission" });
export const announcementsRepo = createMockRepository<Announcement>({ collection: "announcements", seed: seedAnnouncements, searchFields: ["title", "body"], defaultSort: { sortBy: "createdAt", sortOrder: "desc" }, entity: "Announcement" });
export const resourcesRepo = createMockRepository<InstitutionResource>({ collection: "institutionResources", seed: seedResources, searchFields: ["title"], defaultSort: { sortBy: "createdAt", sortOrder: "desc" }, entity: "Resource" });

export const classLabel = (c: Pick<ClassGroup, "grade" | "section">) => `${c.grade}${c.section}`;

export const schoolService = {
  institution: (id: string) => institutionsRepo.get(id),
  updateInstitution: (id: string, patch: Parameters<typeof institutionsRepo.update>[1]) => institutionsRepo.update(id, patch),
  sessions: async (inst: string) => (await sessionsRepo.all()).filter((s) => s.institutionId === inst),
  classes: async (inst: string) => (await classGroupsRepo.all()).filter((c) => c.institutionId === inst),
  members: async (inst: string, kind?: "teacher" | "student") => (await membersRepo.all()).filter((m) => m.institutionId === inst && (!kind || m.kind === kind)),
  assignments: async (filter: { institutionId?: string; teacherId?: string }) => (await assignmentsRepo.all()).filter((a) => (!filter.institutionId || a.institutionId === filter.institutionId) && (!filter.teacherId || a.teacherId === filter.teacherId)),
  submissions: async (assignmentId?: string) => (await submissionsRepo.all()).filter((s) => !assignmentId || s.assignmentId === assignmentId),
  announcements: async (inst: string) => (await announcementsRepo.all()).filter((a) => a.institutionId === inst),
  resources: async (inst: string) => (await resourcesRepo.all()).filter((r) => r.institutionId === inst),

  async saveAssignment(a: Assignment, distribute: boolean) {
    await mockRequest(300);
    if (!a.title.trim() || !a.classGroupIds.length) invalid("ASSIGNMENT_INCOMPLETE");
    const exists = await assignmentsRepo.find(a.id);
    const status = distribute ? "assigned" : a.status;
    const saved = exists ? await assignmentsRepo.update(a.id, { ...a, status }) : await assignmentsRepo.create({ ...a, status });
    if (distribute && exists?.status !== "assigned") {
      const classes = await classGroupsRepo.raw();
      const studentIds = classes.filter((c) => a.classGroupIds.includes(c.id)).flatMap((c) => c.studentIds);
      const members = (await membersRepo.raw()).filter((m) => studentIds.includes(m.id));
      const existing = await submissionsRepo.raw();
      const fresh = members.filter((m) => !existing.some((s) => s.assignmentId === saved.id && (s.studentId === (m.userId ?? m.id)))).map((m) => ({ id: newId("sub"), assignmentId: saved.id, studentId: m.userId ?? m.id, studentName: m.name, status: "pending" as const, content: "", attachments: [], createdAt: nowIso(), updatedAt: nowIso() }));
      await submissionsRepo.replaceAll([...fresh, ...existing]);
      await notificationService.push({ portal: "student", type: "new_assignment", title: `নতুন অ্যাসাইনমেন্ট: ${saved.title}`, body: `জমার শেষ সময়: ${new Date(saved.dueAt).toLocaleDateString("bn-BD")}`, href: "/student/study-planner", priority: "normal" });
    }
    return saved;
  },
  removeAssignment: (id: string) => assignmentsRepo.remove(id),
  async gradeSubmission(id: string, marks: number, feedback: string, grader: string) {
    await mockRequest(250);
    const s = await submissionsRepo.update(id, { marks, feedback, gradedBy: grader, status: "graded" });
    if (s.studentId === "u-student-1") await notificationService.push({ portal: "student", type: "teacher_feedback", title: "অ্যাসাইনমেন্টের নম্বর প্রকাশিত", body: `${marks} নম্বর · ${feedback.slice(0, 60)}`, href: "/student/notifications", priority: "normal" });
    return s;
  },
  async returnSubmission(id: string, note: string) {
    return submissionsRepo.update(id, { status: "returned", feedback: note });
  },
  async giveFeedback(input: { studentId: string; teacherName: string; subjectId: string; text: string; kind: "praise" | "concern" | "suggestion" }) {
    await mockRequest(300);
    const fb = await teacherFeedbackRepo.create({ id: newId("tf"), ...input, at: nowIso(), acknowledged: false });
    await notificationService.push({ portal: "parent", type: "teacher_feedback", title: `শিক্ষকের মন্তব্য: ${input.teacherName}`, body: input.text.slice(0, 80), href: "/parent/feedback", priority: "normal" });
    return fb;
  },
  saveClass: (c: ClassGroup) => (c.id && c.sessionId ? classGroupsRepo.find(c.id).then((x) => (x ? classGroupsRepo.update(c.id, c) : classGroupsRepo.create(c))) : classGroupsRepo.create({ ...c, id: newId("cg") })),
  removeClass: (id: string) => classGroupsRepo.remove(id),
  saveSession: async (s: AcademicSession) => {
    if (s.current) await sessionsRepo.bulkUpdate((await sessionsRepo.raw()).filter((x) => x.institutionId === s.institutionId && x.id !== s.id).map((x) => x.id), { current: false });
    return (await sessionsRepo.find(s.id)) ? sessionsRepo.update(s.id, s) : sessionsRepo.create(s);
  },
  saveAnnouncement: async (a: Announcement) => {
    const saved = (await announcementsRepo.find(a.id)) ? await announcementsRepo.update(a.id, a) : await announcementsRepo.create(a);
    if (a.status === "published") await notificationService.push({ portal: "student", type: "system", title: `ঘোষণা: ${a.title}`, body: a.body.slice(0, 80), priority: a.pinned ? "high" : "normal" });
    return saved;
  },
  removeAnnouncement: (id: string) => announcementsRepo.remove(id),
  saveResource: (r: InstitutionResource) => resourcesRepo.find(r.id).then((x) => (x ? resourcesRepo.update(r.id, r) : resourcesRepo.create(r))),
  removeResource: (id: string) => resourcesRepo.remove(id),
  saveMember: (m: Parameters<typeof membersRepo.create>[0]) => membersRepo.find(m.id ?? "").then((x) => (x && m.id ? membersRepo.update(m.id, m) : membersRepo.create(m))),
  updateMembers: (ids: string[], patch: Parameters<typeof membersRepo.bulkUpdate>[1]) => membersRepo.bulkUpdate(ids, patch),
  removeMembers: (ids: string[]) => membersRepo.bulkRemove(ids),
  SEED_EPOCH,
};
