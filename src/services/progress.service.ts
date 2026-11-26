import type { ActivityEntry, ChapterProgress, GamificationState, QuestionAttempt, TopicMastery } from "@/contracts";
import { getDocument, saveDocument } from "@/lib/mock-db";
import { BADGES, computeMastery, seedActivity, seedAttempts, seedChapterProgress, seedGamification } from "@/mock-data/progress";
import { topics } from "@/mock-data/curriculum";
import { dateKey } from "@/mock-data/utils";
import { createMockRepository } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { isRemote, remote } from "./core/remote";
import { notificationService } from "./notification.service";

/**
 * Learning engine (§19, §25): attempts → topic mastery → chapter progress → activity/XP/streak/badges.
 * Every student-owned collection is namespaced by student id so parents/teachers can read a
 * specific child's data and the demo student switcher keeps records separate.
 */
const cache = new Map<string, ReturnType<typeof build>>();

function build(studentId: string) {
  return {
    attempts: createMockRepository<QuestionAttempt>({ collection: `attempts:${studentId}`, seed: () => seedAttempts(studentId), timestamps: false, latency: 100, defaultSort: { sortBy: "answeredAt", sortOrder: "desc" } }),
    mastery: createMockRepository<TopicMastery>({ collection: `mastery:${studentId}`, seed: () => computeMastery(seedAttempts(studentId)), timestamps: false, latency: 100 }),
    chapters: createMockRepository<ChapterProgress>({ collection: `chapterProgress:${studentId}`, seed: () => seedChapterProgress(studentId), timestamps: false, latency: 100 }),
    activity: createMockRepository<ActivityEntry>({ collection: `activity:${studentId}`, seed: () => seedActivity(studentId), timestamps: false, latency: 100, defaultSort: { sortBy: "at", sortOrder: "desc" } }),
  };
}

export function progressRepos(studentId: string) {
  let r = cache.get(studentId);
  if (!r) {
    r = build(studentId);
    cache.set(studentId, r);
  }
  return r;
}

const gamKey = (studentId: string) => `gamification:${studentId}`;

export const LEVEL_XP = 1000;
export const levelFor = (xp: number) => ({ level: Math.floor(xp / LEVEL_XP) + 1, into: xp % LEVEL_XP, next: LEVEL_XP });

export type AttemptInput = Omit<QuestionAttempt, "id" | "answeredAt"> & { answeredAt?: string };

async function awardXp(studentId: string, xp: number, label: string) {
  const g = await getDocument<GamificationState>(gamKey(studentId), () => seedGamification(studentId));
  const today = dateKey(0);
  const yesterday = dateKey(-1);
  const streak = { ...g.streak };
  if (streak.lastActiveDate !== today) {
    streak.current = streak.lastActiveDate === yesterday ? streak.current + 1 : 1;
    streak.longest = Math.max(streak.longest, streak.current);
    streak.lastActiveDate = today;
  }
  const next: GamificationState = {
    ...g,
    xp: g.xp + xp,
    points: g.points + Math.round(xp / 4),
    streak,
    history: [{ id: newId("h"), at: nowIso(), label, xp }, ...g.history].slice(0, 100),
  };
  await saveDocument(gamKey(studentId), next);
  return next;
}

async function grantBadge(studentId: string, badgeId: string) {
  if (isRemote()) return; // Badges are awarded by the server.
  const g = await getDocument<GamificationState>(gamKey(studentId), () => seedGamification(studentId));
  if (g.badges.some((b) => b.id === badgeId)) return;
  await saveDocument(gamKey(studentId), { ...g, badges: [...g.badges, { id: badgeId, earnedAt: nowIso() }] });
  const def = BADGES.find((b) => b[0] === badgeId);
  if (def)
    await notificationService.push({ portal: "student", type: "achievement", title: `নতুন ব্যাজ: ${def[1]}`, body: def[3], href: "/student/achievements", priority: "low" });
}

export const progressService = {
  attempts: (studentId: string) => progressRepos(studentId).attempts.all(),
  mastery: (studentId: string) => progressRepos(studentId).mastery.all(),
  chapterProgress: (studentId: string) => progressRepos(studentId).chapters.all(),
  activity: (studentId: string) => progressRepos(studentId).activity.all(),
  async gamification(studentId: string) {
    if (isRemote()) return remote.get<GamificationState>(`/progress/${studentId}/gamification`);
    await mockRequest(100);
    return getDocument<GamificationState>(gamKey(studentId), () => seedGamification(studentId));
  },

  /** Records answers from practice/exams/quizzes and updates mastery (ADP-24). */
  async recordAttempts(studentId: string, inputs: AttemptInput[], opts: { minutes?: number; label?: string } = {}) {
    if (!inputs.length) return;
    if (isRemote()) {
      // Mastery, XP, streak and badges are computed on the server.
      await remote.post(`/progress/${studentId}/attempts`, {
        attempts: inputs.map((a) => ({ questionId: a.questionId, correct: a.correct, source: a.source, timeSpentSec: a.timeSpentSec })),
        minutes: opts.minutes,
        label: opts.label,
      });
      return;
    }
    const repos = progressRepos(studentId);
    const stamp = nowIso();
    const attempts = inputs.map((a) => ({ ...a, id: newId("att"), answeredAt: a.answeredAt ?? stamp }));
    const existing = await repos.attempts.raw();
    await repos.attempts.replaceAll([...attempts, ...existing]);

    const mastery = await repos.mastery.raw();
    const byId = new Map(mastery.map((m) => [m.id, m]));
    for (const a of attempts) {
      const topicId = a.topicId ?? topics.find((t) => t.chapterId === a.chapterId)?.id;
      if (!topicId) continue;
      const m = byId.get(topicId) ?? { id: topicId, topicId, chapterId: a.chapterId, subjectId: a.subjectId, attempts: 0, correct: 0, mastery: 50, trend: [], mistakes: {} };
      const mastered = Math.round(m.mastery + 0.3 * ((a.correct ? 100 : 0) - m.mastery));
      byId.set(topicId, {
        ...m,
        attempts: m.attempts + 1,
        correct: m.correct + (a.correct ? 1 : 0),
        mastery: mastered,
        lastPracticedAt: a.answeredAt,
        trend: [...m.trend, mastered].slice(-8),
        mistakes: a.correct ? m.mistakes : { ...m.mistakes, concept_confusion: (m.mistakes.concept_confusion ?? 0) + 1 },
      });
    }
    await repos.mastery.replaceAll([...byId.values()]);

    const correct = attempts.filter((a) => a.correct).length;
    const minutes = opts.minutes ?? Math.max(1, Math.round(attempts.reduce((s, a) => s + (a.timeSpentSec ?? 45), 0) / 60));
    await progressService.logActivity(studentId, { kind: attempts[0].source === "exam" ? "exam" : "practice", minutes, label: opts.label ?? "প্রশ্ন অনুশীলন", xp: correct * 10 + (attempts.length - correct) * 2 });
    const total = existing.length + attempts.length;
    if (total >= 100) await grantBadge(studentId, "questions-100");
    if (total >= 500) await grantBadge(studentId, "questions-500");
  },

  async logActivity(studentId: string, entry: { kind: ActivityEntry["kind"]; minutes: number; label: string; xp?: number }) {
    if (isRemote()) {
      await remote.post(`/progress/${studentId}/activity`, { kind: entry.kind, minutes: entry.minutes, label: entry.label });
      return;
    }
    const repos = progressRepos(studentId);
    const xp = entry.xp ?? Math.round(entry.minutes * 1.5);
    await repos.activity.replaceAll([{ id: newId("act"), date: dateKey(0), at: nowIso(), ...entry, xp }, ...(await repos.activity.raw())]);
    const g = await awardXp(studentId, xp, entry.label);
    if (g.streak.current >= 7) await grantBadge(studentId, "streak-7");
    if (g.streak.current >= 30) await grantBadge(studentId, "streak-30");
    if (new Date().getHours() >= 22) await grantBadge(studentId, "night-owl");
  },

  async setChapterStatus(studentId: string, chapterId: string, subjectId: string, action: "start" | "complete" | "reset" | { topicDone: string; totalTopics: number }) {
    if (isRemote()) return remote.post<ChapterProgress>(`/progress/${studentId}/chapters/${chapterId}`, { action });
    await mockRequest(150);
    const repos = progressRepos(studentId);
    const list = await repos.chapters.raw();
    const current: ChapterProgress = list.find((c) => c.id === chapterId) ?? { id: chapterId, chapterId, subjectId, status: "not_started", percent: 0, topicsCompleted: [], history: [] };
    const at = nowIso();
    let next: ChapterProgress;
    if (action === "start") next = { ...current, status: current.status === "completed" ? "completed" : "in_progress", lastStudiedAt: at, history: [...current.history, { at, action: current.history.length ? "resumed" : "started" }] };
    else if (action === "complete") next = { ...current, status: "completed", percent: 100, completedAt: at, lastStudiedAt: at, history: [...current.history, { at, action: "completed" }] };
    else if (action === "reset") next = { ...current, status: "not_started", percent: 0, topicsCompleted: [], completedAt: undefined, history: [...current.history, { at, action: "reset" }] };
    else {
      const done = [...new Set([...current.topicsCompleted, action.topicDone])];
      const percent = Math.round((done.length / Math.max(1, action.totalTopics)) * 100);
      next = { ...current, topicsCompleted: done, percent, status: percent >= 100 ? "completed" : "in_progress", lastStudiedAt: at, completedAt: percent >= 100 ? at : current.completedAt, history: [...current.history, { at, action: percent >= 100 ? "completed" : "topic_done" }] };
    }
    await repos.chapters.replaceAll([next, ...list.filter((c) => c.id !== chapterId)]);
    if (next.status === "completed" && current.status !== "completed") {
      await awardXp(studentId, 150, "অধ্যায় সম্পন্ন");
      const completed = list.filter((c) => c.status === "completed").length + 1;
      if (completed >= 5) await grantBadge(studentId, "chapter-5");
      if (completed >= 20) await grantBadge(studentId, "chapter-20");
    }
    if (action === "start" && !list.length) await grantBadge(studentId, "first-steps");
    return next;
  },

  async claimMission(studentId: string, missionId: string, xp: number) {
    if (isRemote()) return remote.post<GamificationState>(`/progress/${studentId}/missions/${missionId}/claim`);
    await mockRequest(200);
    const g = await getDocument<GamificationState>(gamKey(studentId), () => seedGamification(studentId));
    if (g.claimedMissions.includes(missionId)) return g;
    await saveDocument(gamKey(studentId), { ...g, claimedMissions: [...g.claimedMissions, missionId] });
    return awardXp(studentId, xp, "মিশন পুরস্কার");
  },

  async useStreakFreeze(studentId: string) {
    if (isRemote()) return remote.post<GamificationState>(`/progress/${studentId}/streak-freeze`);
    await mockRequest(200);
    const g = await getDocument<GamificationState>(gamKey(studentId), () => seedGamification(studentId));
    if (g.streak.freezeAvailable < 1) return g;
    const next = { ...g, streak: { ...g.streak, freezeAvailable: g.streak.freezeAvailable - 1, lastActiveDate: dateKey(0) } };
    await saveDocument(gamKey(studentId), next);
    return next;
  },

  async updateChallenge(studentId: string, challenges: GamificationState["friendChallenges"]) {
    if (isRemote()) {
      await remote.put(`/progress/${studentId}/challenges`, { challenges });
      return;
    }
    const g = await getDocument<GamificationState>(gamKey(studentId), () => seedGamification(studentId));
    await saveDocument(gamKey(studentId), { ...g, friendChallenges: challenges });
  },

  grantBadge,
};

export { BADGES };
