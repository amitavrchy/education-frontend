import type { StudentProfile, StudyGoal, StudyPlanSettings, StudyTask, TaskType } from "@/contracts";
import { getDocument, saveDocument } from "@/lib/mock-db";
import { chapters as allChapters } from "@/mock-data/curriculum";
import { defaultStudentProfile } from "@/mock-data/users";
import { dateKey, rng } from "@/mock-data/utils";
import { seededSubjects } from "@/mock-data/progress";
import { createMockRepository } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { onOnboardingComplete } from "./onboarding.service";
import { progressService } from "./progress.service";

const START_TIMES: Record<StudyPlanSettings["preferredTime"], number> = { early_morning: 6, morning: 9, afternoon: 15, evening: 18, night: 21 };

const repos = new Map<string, ReturnType<typeof createMockRepository<StudyTask>>>();
const goalRepos = new Map<string, ReturnType<typeof createMockRepository<StudyGoal & { updatedAt?: string }>>>();

function settingsFrom(profile: Pick<StudentProfile, "targetGpa" | "dailyMinutes" | "preferredTime" | "studyDays" | "targetExamDate" | "subjectIds" | "optionalSubjectIds" | "weakSubjectIds" | "weakChapterIds">): StudyPlanSettings {
  const subjects = [...profile.subjectIds, ...profile.optionalSubjectIds];
  return {
    id: "settings",
    targetGpa: profile.targetGpa,
    dailyMinutes: profile.dailyMinutes,
    preferredTime: profile.preferredTime,
    studyDays: profile.studyDays,
    examDate: profile.targetExamDate,
    subjectPriority: Object.fromEntries(subjects.map((s) => [s, profile.weakSubjectIds.includes(s) ? 3 : 2])),
    chapterPriority: Object.fromEntries(profile.weakChapterIds.map((c) => [c, 3])),
    remindersEnabled: true,
  };
}

/**
 * Plan generation simulation (§18 PLAN-18): weighted round-robin over subjects by priority,
 * weak chapters first, spaced revision 1/3/7 days after each study block, practice + exam prep near the exam.
 */
export function generateTasks(settings: StudyPlanSettings, opts: { fromOffset?: number; days?: number; seed?: string; withHistory?: boolean } = {}): StudyTask[] {
  const { fromOffset = 0, days = 28, seed = "plan", withHistory = false } = opts;
  const r = rng(seed);
  const weighted = Object.entries(settings.subjectPriority).flatMap(([s, p]) => Array(Math.max(1, p)).fill(s) as string[]);
  if (!weighted.length) return [];
  const pointer = new Map<string, number>();
  const nextChapter = (subjectId: string) => {
    const list = allChapters.filter((c) => c.subjectId === subjectId);
    const weak = list.filter((c) => settings.chapterPriority[c.id] >= 3);
    const ordered = [...weak, ...list.filter((c) => !weak.includes(c))];
    const i = pointer.get(subjectId) ?? 0;
    pointer.set(subjectId, i + 1);
    return ordered[i % ordered.length];
  };
  const tasks: StudyTask[] = [];
  const examDate = settings.examDate ? new Date(settings.examDate) : null;
  const stamp = nowIso();
  for (let d = fromOffset; d < fromOffset + days; d++) {
    const date = dateKey(d);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (!settings.studyDays.includes(weekday)) continue;
    let minutes = settings.dailyMinutes;
    let hour = START_TIMES[settings.preferredTime];
    let block = 0;
    const daysToExam = examDate ? Math.round((examDate.getTime() - new Date(`${date}T12:00:00`).getTime()) / 86400000) : 999;
    while (minutes >= 25 && block < 4) {
      const subjectId = weighted[(d * 3 + block * 7 + r.int(0, weighted.length)) % weighted.length];
      const chapter = nextChapter(subjectId);
      if (!chapter) break;
      const duration = Math.min(minutes, block === 0 ? 50 : r.pick([30, 40, 45]));
      const type: TaskType = daysToExam < 21 && block === 1 ? "exam_prep" : block === 2 ? "practice" : block === 3 ? "reading" : "study";
      const start = `${String(hour).padStart(2, "0")}:${block % 2 ? "30" : "00"}`;
      tasks.push({
        id: newId("task"),
        title: type === "exam_prep" ? "পরীক্ষা প্রস্তুতি: মডেল টেস্ট" : type === "practice" ? "প্রশ্ন অনুশীলন" : type === "reading" ? "পাঠ্যবই পড়া" : "অধ্যায় অধ্যয়ন",
        subjectId,
        chapterId: chapter.id,
        type,
        date,
        start,
        durationMinutes: duration,
        status: "scheduled",
        priority: settings.chapterPriority[chapter.id] >= 3 || settings.subjectPriority[subjectId] >= 3 ? "high" : block === 0 ? "medium" : "low",
        reminder: settings.remindersEnabled && block === 0,
        source: "generated",
        createdAt: stamp,
        updatedAt: stamp,
      });
      // Spaced revision of the study block.
      if (type === "study") {
        for (const gap of [1, 3, 7]) {
          const revDate = dateKey(d + gap);
          if (d + gap >= fromOffset + days) continue;
          tasks.push({
            id: newId("task"),
            title: "রিভিশন",
            subjectId,
            chapterId: chapter.id,
            type: "revision",
            date: revDate,
            start: `${String(Math.min(22, START_TIMES[settings.preferredTime] + 3)).padStart(2, "0")}:15`,
            durationMinutes: 15,
            status: "scheduled",
            priority: "medium",
            reminder: false,
            source: "generated",
            createdAt: stamp,
            updatedAt: stamp,
          });
        }
      }
      minutes -= duration;
      hour += 1;
      block += 1;
    }
  }
  if (withHistory) {
    for (const t of tasks) {
      if (t.date < dateKey(0)) {
        const done = r.bool(0.78);
        t.status = done ? "completed" : "missed";
        if (done) {
          t.completedAt = `${t.date}T${t.start}:00.000Z`;
          t.reflection = { rating: r.pick([3, 4, 4, 5]) as 3 | 4 | 5, actualMinutes: t.durationMinutes + r.int(-10, 10) };
        }
      }
    }
  }
  return tasks.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

function seedProfileFor(studentId: string): StudentProfile {
  const base = defaultStudentProfile({ id: studentId, name: "" });
  return { ...base, subjectIds: seededSubjects(studentId), optionalSubjectIds: [] };
}

export function taskRepo(studentId: string) {
  let r = repos.get(studentId);
  if (!r) {
    r = createMockRepository<StudyTask>({
      collection: `tasks:${studentId}`,
      seed: () => generateTasks(settingsFrom(seedProfileFor(studentId)), { fromOffset: -14, days: 42, seed: `plan-${studentId}`, withHistory: true }),
      searchFields: ["title", "notes"],
      latency: 120,
      defaultSort: { sortBy: "date", sortOrder: "asc" },
    });
    repos.set(studentId, r);
  }
  return r;
}

function goalRepo(studentId: string) {
  let r = goalRepos.get(studentId);
  if (!r) {
    r = createMockRepository<StudyGoal>({
      collection: `goals:${studentId}`,
      timestamps: false,
      seed: () => [
        { id: "g-1", title: "এই সপ্তাহে ১০ ঘণ্টা পড়া", metric: "minutes", target: 600, current: 410, period: "weekly", createdAt: nowIso() },
        { id: "g-2", title: "প্রতিদিন ২০টি প্রশ্ন", metric: "questions", target: 20, current: 12, period: "daily", createdAt: nowIso() },
        { id: "g-3", title: "এই মাসে ৬টি অধ্যায় শেষ", metric: "chapters", target: 6, current: 3, period: "monthly", createdAt: nowIso() },
        { id: "g-4", title: "সপ্তাহে ২টি মডেল টেস্ট", metric: "exams", target: 2, current: 1, period: "weekly", createdAt: nowIso() },
      ],
    });
    goalRepos.set(studentId, r);
  }
  return r;
}

const settingsKey = (studentId: string) => `planSettings:${studentId}`;

export const studyPlannerService = {
  tasks: (studentId: string) => taskRepo(studentId).all(),
  async settings(studentId: string) {
    await mockRequest(100);
    return getDocument<StudyPlanSettings>(settingsKey(studentId), () => settingsFrom(seedProfileFor(studentId)));
  },
  async saveSettings(studentId: string, settings: StudyPlanSettings) {
    await mockRequest(200);
    await saveDocument(settingsKey(studentId), settings);
    return settings;
  },

  /** Regenerates future generated tasks; keeps manual/teacher tasks and history. */
  async regenerate(studentId: string, settings?: StudyPlanSettings) {
    await mockRequest(900);
    const s = settings ?? (await studyPlannerService.settings(studentId));
    const repo = taskRepo(studentId);
    const today = dateKey(0);
    const kept = (await repo.raw()).filter((t) => t.date < today || t.source !== "generated" || t.status === "completed");
    const fresh = generateTasks(s, { fromOffset: 0, days: 28, seed: `plan-${studentId}-${Date.now()}` });
    await repo.replaceAll([...kept, ...fresh]);
    await saveDocument(settingsKey(studentId), { ...s, generatedAt: nowIso() });
    return fresh.length;
  },

  createTask: (studentId: string, task: Omit<StudyTask, "id" | "createdAt" | "updatedAt">) => taskRepo(studentId).create({ ...task, createdAt: nowIso(), updatedAt: nowIso() } as StudyTask),
  updateTask: (studentId: string, id: string, patch: Partial<StudyTask>) => taskRepo(studentId).update(id, patch),
  removeTask: (studentId: string, id: string) => taskRepo(studentId).remove(id),

  async reschedule(studentId: string, id: string, date: string, start?: string) {
    const repo = taskRepo(studentId);
    const task = await repo.get(id);
    return repo.update(id, { date, start: start ?? task.start, status: "scheduled", rescheduledFrom: task.rescheduledFrom ?? task.date });
  },

  /** Moves all missed tasks to the next study days. */
  async rescheduleMissed(studentId: string) {
    await mockRequest(300);
    const repo = taskRepo(studentId);
    const settings = await studyPlannerService.settings(studentId);
    const missed = (await repo.raw()).filter((t) => t.status === "missed" || (t.status === "scheduled" && t.date < dateKey(0)));
    let offset = 0;
    const items = await repo.raw();
    for (const t of missed) {
      do offset++;
      while (!settings.studyDays.includes(new Date(`${dateKey(offset)}T12:00:00`).getDay()) && offset < 14);
      const i = items.findIndex((x) => x.id === t.id);
      items[i] = { ...t, date: dateKey(offset), status: "scheduled", rescheduledFrom: t.date, updatedAt: nowIso() };
    }
    await repo.replaceAll(items);
    return missed.length;
  },

  async complete(studentId: string, id: string, reflection: NonNullable<StudyTask["reflection"]>) {
    const repo = taskRepo(studentId);
    const task = await repo.update(id, { status: "completed", completedAt: nowIso(), reflection });
    await progressService.logActivity(studentId, { kind: task.type === "practice" ? "practice" : task.type === "reading" ? "reading" : "study", minutes: reflection.actualMinutes, label: task.title });
    if (task.chapterId && task.subjectId && task.type === "study") await progressService.setChapterStatus(studentId, task.chapterId, task.subjectId, "start");
    return task;
  },

  /** Marks past scheduled tasks as missed (run on planner load). */
  async sweepMissed(studentId: string) {
    const repo = taskRepo(studentId);
    const items = await repo.raw();
    const today = dateKey(0);
    const stale = items.filter((t) => t.status === "scheduled" && t.date < today);
    if (stale.length) await repo.bulkUpdate(stale.map((t) => t.id), { status: "missed" });
  },

  goals: (studentId: string) => goalRepo(studentId).all(),
  saveGoal: (studentId: string, goal: StudyGoal) => (goal.id ? goalRepo(studentId).update(goal.id, goal) : goalRepo(studentId).create({ ...goal, id: newId("g"), createdAt: nowIso() })),
  createGoal: (studentId: string, goal: Omit<StudyGoal, "id" | "createdAt">) => goalRepo(studentId).create({ ...goal, id: newId("g"), createdAt: nowIso() }),
  removeGoal: (studentId: string, id: string) => goalRepo(studentId).remove(id),
  updateGoal: (studentId: string, id: string, patch: Partial<StudyGoal>) => goalRepo(studentId).update(id, patch),
};

// First-week plan right after onboarding (AUTH-29 / PLAN-18).
onOnboardingComplete(async (profile) => {
  const settings = settingsFrom(profile);
  await saveDocument(settingsKey(profile.id), settings);
  await studyPlannerService.regenerate(profile.id, settings);
});
