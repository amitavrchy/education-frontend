"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNow } from "@/hooks/use-now";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useActivity, useChapterProgress, useGamification, useMastery } from "@/hooks/use-progress";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { dateKey } from "@/mock-data/utils";
import { examService } from "@/services/exam.service";
import { flashcardService } from "@/services/flashcards.service";
import { studyPlannerService } from "@/services/study-planner.service";

/** Derived, shared dashboard data (each widget still owns its own query for independent states). */
export function useDashboardData() {
  const now = useNow();
  const studentId = useStudentId();
  const profile = useStudentProfile();
  const { index: cur } = useCurriculum();
  const activity = useActivity();
  const chapters = useChapterProgress();
  const mastery = useMastery();
  const gamification = useGamification();
  const tasks = useQuery({ queryKey: ["planner", studentId, "tasks"], queryFn: () => studyPlannerService.tasks(studentId) });
  const exams = useQuery({ queryKey: ["exams"], queryFn: examService.list });
  const attempts = useQuery({ queryKey: ["examAttempts", studentId], queryFn: () => examService.attempts(studentId) });
  const cards = useQuery({ queryKey: ["flashcards", studentId, "cards"], queryFn: () => flashcardService.cards(studentId) });

  const today = dateKey(0);
  const mySubjectIds = useMemo(() => new Set([...(profile.data?.subjectIds ?? []), ...(profile.data?.optionalSubjectIds ?? [])]), [profile.data]);

  const minutesToday = useMemo(() => (activity.data ?? []).filter((a) => a.date === today).reduce((s, a) => s + a.minutes, 0), [activity.data, today]);

  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => dateKey(i - 6));
    return days.map((d) => ({ date: d, minutes: (activity.data ?? []).filter((a) => a.date === d).reduce((s, a) => s + a.minutes, 0) }));
  }, [activity.data]);

  const weakTopics = useMemo(
    () => (mastery.data ?? []).filter((m) => m.attempts >= 2 && m.mastery < 55 && (!mySubjectIds.size || mySubjectIds.has(m.subjectId))).sort((a, b) => a.mastery - b.mastery),
    [mastery.data, mySubjectIds],
  );

  const subjectPerformance = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const m of mastery.data ?? []) {
      if (mySubjectIds.size && !mySubjectIds.has(m.subjectId)) continue;
      const e = map.get(m.subjectId) ?? { sum: 0, n: 0 };
      e.sum += m.mastery;
      e.n += 1;
      map.set(m.subjectId, e);
    }
    return [...map.entries()].map(([subjectId, { sum, n }]) => ({ subjectId, mastery: Math.round(sum / n) })).sort((a, b) => b.mastery - a.mastery);
  }, [mastery.data, mySubjectIds]);

  const continueLearning = useMemo(
    () => (chapters.data ?? []).filter((c) => c.status === "in_progress").sort((a, b) => (b.lastStudiedAt ?? "").localeCompare(a.lastStudiedAt ?? "")),
    [chapters.data],
  );

  /** Recommended: weak chapters from onboarding + chapters behind weak topics + next not-started chapters. */
  const recommendedChapterIds = useMemo(() => {
    if (!cur) return [];
    const done = new Set((chapters.data ?? []).filter((c) => c.status === "completed").map((c) => c.chapterId));
    const out: string[] = [];
    const push = (id?: string) => id && !done.has(id) && !out.includes(id) && out.push(id);
    profile.data?.weakChapterIds.forEach(push);
    weakTopics.forEach((t) => push(t.chapterId));
    for (const sid of mySubjectIds) {
      const next = cur.chaptersOf(sid).find((c) => !done.has(c.id) && !(chapters.data ?? []).some((p) => p.chapterId === c.id));
      push(next?.id);
    }
    return out.slice(0, 6);
  }, [cur, chapters.data, profile.data, weakTopics, mySubjectIds]);

  /** Revision: completed chapters not touched for a week, oldest first. */
  const revisionDue = useMemo(() => {
    const cutoff = now - 7 * 864e5;
    return (chapters.data ?? [])
      .filter((c) => c.status === "completed" && new Date(c.lastStudiedAt ?? c.completedAt ?? 0).getTime() < cutoff)
      .sort((a, b) => (a.lastStudiedAt ?? "").localeCompare(b.lastStudiedAt ?? ""));
  }, [chapters.data, now]);

  const dueCards = useMemo(() => (cards.data ?? []).filter((c) => new Date(c.dueAt).getTime() <= now).length, [cards.data, now]);

  const upcomingTasks = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((t) => t.date >= today && (t.status === "scheduled" || t.status === "in_progress"))
        .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)),
    [tasks.data, today],
  );

  const upcomingExams = useMemo(() => {
    const doneExamIds = new Set((attempts.data ?? []).filter((a) => a.status !== "in_progress").map((a) => a.examId));
    return (exams.data ?? [])
      .filter((e) => (e.kind === "institution" || e.kind === "teacher_assigned") && e.status !== "archived" && !doneExamIds.has(e.id) && (!e.closesAt || new Date(e.closesAt).getTime() > now))
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  }, [exams.data, attempts.data, now]);

  return {
    studentId,
    profile,
    cur,
    activity,
    chapters,
    mastery,
    gamification,
    tasks,
    exams,
    attempts,
    cards,
    today,
    mySubjectIds,
    minutesToday,
    week,
    weakTopics,
    subjectPerformance,
    continueLearning,
    recommendedChapterIds,
    revisionDue,
    dueCards,
    upcomingTasks,
    upcomingExams,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
