import type { GuardianLink, StudyGoal, TeacherFeedback } from "@/contracts";
import { getDocument, saveDocument } from "@/lib/mock-db";
import { dateKey, daysFromNow } from "@/mock-data/utils";
import { examService } from "./exam.service";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notificationService } from "./notification.service";
import { guardianLinksRepo, profileService, teacherFeedbackRepo } from "./people.service";
import { progressService } from "./progress.service";
import { studyPlannerService } from "./study-planner.service";

/**
 * Guardian portal (§27). A guardian only ever sees what the link's permissions allow;
 * AI conversations stay private unless the STUDENT enables sharing (guardians cannot turn it on).
 */

export const DEMO_LINK_CODE = "SHK-2741";

interface GuardianGoal extends StudyGoal {
  studentId: string;
}

const goalsKey = (guardianId: string) => `guardianGoals:${guardianId}`;

export interface ChildSummary {
  link: GuardianLink;
  minutesWeek: number;
  minutesPrevWeek: number;
  tasksDone: number;
  tasksMissed: number;
  avgScore: number | null;
  streak: number;
  weakTopicIds: string[];
  subjectMastery: { subjectId: string; mastery: number }[];
}

export const guardianService = {
  links: async (guardianId: string) => (await guardianLinksRepo.all()).filter((l) => l.guardianId === guardianId && l.status !== "revoked"),

  /** Link flow: student shares a code from their settings → OTP to guardian → active. */
  async requestLink(guardianId: string, input: { code: string; relation: string }) {
    await mockRequest(600);
    if (input.code.trim().toUpperCase() !== DEMO_LINK_CODE) invalid("LINK_CODE_INVALID");
    const existing = (await guardianLinksRepo.raw()).find((l) => l.guardianId === guardianId && l.studentId === "u-student-3");
    if (existing && existing.status === "active") invalid("ALREADY_LINKED");
    if (existing) return guardianLinksRepo.update(existing.id, { status: "pending", relation: input.relation });
    return guardianLinksRepo.create({ id: newId("gl"), guardianId, studentId: "u-student-3", studentName: "তাহসিন রহমান", relation: input.relation, status: "pending", permissions: { progress: true, scores: true, studyTime: true, calendar: false, teacherFeedback: true, aiConversations: false }, code: input.code.trim().toUpperCase() });
  },
  async confirmLink(linkId: string, otp: string) {
    await mockRequest(500);
    if (otp !== "123456") invalid("OTP_INVALID");
    return guardianLinksRepo.update(linkId, { status: "active", linkedAt: nowIso() });
  },
  async unlink(linkId: string) {
    await mockRequest(300);
    return guardianLinksRepo.update(linkId, { status: "revoked" });
  },
  /** Guardians may switch sharing OFF; turning AI-conversation sharing ON needs the student. */
  async setPermission(linkId: string, key: keyof GuardianLink["permissions"], value: boolean) {
    await mockRequest(200);
    if (key === "aiConversations" && value) invalid("STUDENT_CONSENT_REQUIRED");
    const link = await guardianLinksRepo.get(linkId);
    return guardianLinksRepo.update(linkId, { permissions: { ...link.permissions, [key]: value } });
  },

  async summary(link: GuardianLink): Promise<ChildSummary> {
    const id = link.studentId;
    const [activity, tasks, attempts, gam, mastery] = await Promise.all([progressService.activity(id), studyPlannerService.tasks(id), examService.attempts(id), progressService.gamification(id), progressService.mastery(id)]);
    const wk = dateKey(-6);
    const pwk = dateKey(-13);
    const today = dateKey(0);
    const done = attempts.filter((a) => a.result);
    const bySubject = new Map<string, { s: number; n: number }>();
    for (const m of mastery) {
      const e = bySubject.get(m.subjectId) ?? { s: 0, n: 0 };
      e.s += m.mastery;
      e.n += 1;
      bySubject.set(m.subjectId, e);
    }
    return {
      link,
      minutesWeek: activity.filter((a) => a.date >= wk).reduce((s, a) => s + a.minutes, 0),
      minutesPrevWeek: activity.filter((a) => a.date >= pwk && a.date < wk).reduce((s, a) => s + a.minutes, 0),
      tasksDone: tasks.filter((t) => t.status === "completed" && t.date >= wk && t.date <= today).length,
      tasksMissed: tasks.filter((t) => t.status === "missed" && t.date >= wk).length,
      avgScore: done.length ? Math.round(done.reduce((s, a) => s + a.result!.percent, 0) / done.length) : null,
      streak: gam.streak.current,
      weakTopicIds: mastery.filter((m) => m.attempts >= 2 && m.mastery < 55).sort((a, b) => a.mastery - b.mastery).slice(0, 5).map((m) => m.topicId),
      subjectMastery: [...bySubject.entries()].map(([subjectId, e]) => ({ subjectId, mastery: Math.round(e.s / e.n) })).sort((a, b) => b.mastery - a.mastery),
    };
  },

  feedback: async (studentId: string) => (await teacherFeedbackRepo.all()).filter((f) => f.studentId === studentId).sort((a, b) => b.at.localeCompare(a.at)),
  acknowledge: (id: string) => teacherFeedbackRepo.update(id, { acknowledged: true }),
  async replyToTeacher(feedback: TeacherFeedback, guardianName: string, message: string) {
    await mockRequest(400);
    await notificationService.push({ portal: "teacher", type: "teacher_feedback", title: `অভিভাবকের বার্তা: ${guardianName}`, body: message.slice(0, 120), href: "/teacher/students", priority: "normal" });
    return teacherFeedbackRepo.update(feedback.id, { acknowledged: true });
  },

  async goals(guardianId: string) {
    await mockRequest(100);
    return getDocument<{ id: string; items: GuardianGoal[] }>(goalsKey(guardianId), () => ({
      id: "goals",
      items: [
        { id: "gg-1", studentId: "u-student-1", title: "সপ্তাহে ১০ ঘণ্টা পড়াশোনা", metric: "minutes", target: 600, current: 0, period: "weekly", createdAt: daysFromNow(-10) },
        { id: "gg-2", studentId: "u-student-1", title: "সপ্তাহে ২টি মডেল টেস্ট", metric: "exams", target: 2, current: 0, period: "weekly", createdAt: daysFromNow(-10) },
        { id: "gg-3", studentId: "u-student-2", title: "সপ্তাহে ৮ ঘণ্টা পড়াশোনা", metric: "minutes", target: 480, current: 0, period: "weekly", createdAt: daysFromNow(-6) },
      ],
    })).then((d) => d.items);
  },
  async saveGoals(guardianId: string, items: GuardianGoal[]) {
    await mockRequest(200);
    await saveDocument(goalsKey(guardianId), { id: "goals", items });
    return items;
  },
  /** Live value of a goal from the child's actual activity this week. */
  async goalProgress(goal: GuardianGoal) {
    const wk = dateKey(-6);
    if (goal.metric === "minutes") return (await progressService.activity(goal.studentId)).filter((a) => a.date >= wk).reduce((s, a) => s + a.minutes, 0);
    if (goal.metric === "exams") return (await examService.attempts(goal.studentId)).filter((a) => a.submittedAt && a.submittedAt.slice(0, 10) >= wk).length;
    if (goal.metric === "chapters") return (await progressService.chapterProgress(goal.studentId)).filter((c) => c.completedAt && c.completedAt.slice(0, 10) >= wk).length;
    return (await progressService.attempts(goal.studentId)).filter((a) => a.answeredAt.slice(0, 10) >= wk).length;
  },
  profile: (studentId: string) => profileService.get(studentId),
};

export type { GuardianGoal };
