"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { StudyGoal, StudyPlanSettings, StudyTask } from "@/contracts";
import { useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { studyPlannerService } from "@/services/study-planner.service";
import { progressKeys } from "./use-progress";
import { useStudentId } from "./use-student";

export const plannerKeys = {
  all: (id: string) => ["planner", id] as const,
  tasks: (id: string) => ["planner", id, "tasks"] as const,
  settings: (id: string) => ["planner", id, "settings"] as const,
  goals: (id: string) => ["planner", id, "goals"] as const,
};

export function usePlannerTasks() {
  const id = useStudentId();
  const swept = useRef(false);
  const qc = useQueryClient();
  useEffect(() => {
    if (swept.current) return;
    swept.current = true;
    void studyPlannerService.sweepMissed(id).then(() => qc.invalidateQueries({ queryKey: plannerKeys.tasks(id) }));
  }, [id, qc]);
  return useQuery({ queryKey: plannerKeys.tasks(id), queryFn: () => studyPlannerService.tasks(id) });
}

export function usePlannerSettings() {
  const id = useStudentId();
  return useQuery({ queryKey: plannerKeys.settings(id), queryFn: () => studyPlannerService.settings(id) });
}

export function useGoals() {
  const id = useStudentId();
  return useQuery({ queryKey: plannerKeys.goals(id), queryFn: () => studyPlannerService.goals(id) });
}

export function usePlannerActions() {
  const id = useStudentId();
  const qc = useQueryClient();
  const l = useL();
  const onError = (e: unknown) => toast.error(errorText(e, l));
  const done = () => qc.invalidateQueries({ queryKey: plannerKeys.all(id) });
  return {
    create: useMutation({ mutationFn: (t: Omit<StudyTask, "id" | "createdAt" | "updatedAt">) => studyPlannerService.createTask(id, t), onSuccess: done, onError }),
    update: useMutation({ mutationFn: (v: { id: string; patch: Partial<StudyTask> }) => studyPlannerService.updateTask(id, v.id, v.patch), onSuccess: done, onError }),
    remove: useMutation({ mutationFn: (taskId: string) => studyPlannerService.removeTask(id, taskId), onSuccess: done, onError }),
    reschedule: useMutation({ mutationFn: (v: { id: string; date: string; start?: string }) => studyPlannerService.reschedule(id, v.id, v.date, v.start), onSuccess: done, onError }),
    rescheduleMissed: useMutation({ mutationFn: () => studyPlannerService.rescheduleMissed(id), onSuccess: done, onError }),
    complete: useMutation({
      mutationFn: (v: { id: string; reflection: NonNullable<StudyTask["reflection"]> }) => studyPlannerService.complete(id, v.id, v.reflection),
      onSuccess: () => {
        void done();
        void qc.invalidateQueries({ queryKey: progressKeys.all });
      },
      onError,
    }),
    saveSettings: useMutation({ mutationFn: (s: StudyPlanSettings) => studyPlannerService.saveSettings(id, s), onSuccess: done, onError }),
    regenerate: useMutation({ mutationFn: (s?: StudyPlanSettings) => studyPlannerService.regenerate(id, s), onSuccess: done, onError }),
    createGoal: useMutation({ mutationFn: (g: Omit<StudyGoal, "id" | "createdAt">) => studyPlannerService.createGoal(id, g), onSuccess: done, onError }),
    updateGoal: useMutation({ mutationFn: (v: { id: string; patch: Partial<StudyGoal> }) => studyPlannerService.updateGoal(id, v.id, v.patch), onSuccess: done, onError }),
    removeGoal: useMutation({ mutationFn: (goalId: string) => studyPlannerService.removeGoal(id, goalId), onSuccess: done, onError }),
  };
}
