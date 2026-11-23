"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { progressService, type AttemptInput } from "@/services/progress.service";
import { useStudentId } from "./use-student";

export const progressKeys = {
  all: ["progress"] as const,
  chapters: (id: string) => ["progress", id, "chapters"] as const,
  mastery: (id: string) => ["progress", id, "mastery"] as const,
  attempts: (id: string) => ["progress", id, "attempts"] as const,
  activity: (id: string) => ["progress", id, "activity"] as const,
  gamification: (id: string) => ["progress", id, "gamification"] as const,
};

export function useChapterProgress(studentId?: string) {
  const me = useStudentId();
  const id = studentId ?? me;
  return useQuery({ queryKey: progressKeys.chapters(id), queryFn: () => progressService.chapterProgress(id) });
}
export function useMastery(studentId?: string) {
  const me = useStudentId();
  const id = studentId ?? me;
  return useQuery({ queryKey: progressKeys.mastery(id), queryFn: () => progressService.mastery(id) });
}
export function useAttempts(studentId?: string) {
  const me = useStudentId();
  const id = studentId ?? me;
  return useQuery({ queryKey: progressKeys.attempts(id), queryFn: () => progressService.attempts(id) });
}
export function useActivity(studentId?: string) {
  const me = useStudentId();
  const id = studentId ?? me;
  return useQuery({ queryKey: progressKeys.activity(id), queryFn: () => progressService.activity(id) });
}
export function useGamification(studentId?: string) {
  const me = useStudentId();
  const id = studentId ?? me;
  return useQuery({ queryKey: progressKeys.gamification(id), queryFn: () => progressService.gamification(id) });
}

export function useRecordAttempts() {
  const id = useStudentId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attempts, minutes, label }: { attempts: AttemptInput[]; minutes?: number; label?: string }) => progressService.recordAttempts(id, attempts, { minutes, label }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: progressKeys.all });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useChapterAction() {
  const id = useStudentId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { chapterId: string; subjectId: string; action: Parameters<typeof progressService.setChapterStatus>[3] }) =>
      progressService.setChapterStatus(id, v.chapterId, v.subjectId, v.action),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: progressKeys.all });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
