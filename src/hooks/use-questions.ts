"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Bookmark } from "@/contracts";
import { bookmarkService, practiceSetService } from "@/services/question.service";
import { useStudentId } from "./use-student";

export const bookmarkKey = (id: string) => ["bookmarks", id] as const;
export const practiceSetsKey = (id: string) => ["practiceSets", id] as const;

export function useBookmarks() {
  const id = useStudentId();
  return useQuery({ queryKey: bookmarkKey(id), queryFn: () => bookmarkService.list(id) });
}

export function useToggleBookmark() {
  const id = useStudentId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Bookmark, "id" | "createdAt">) => bookmarkService.toggle(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookmarkKey(id) }),
  });
}

export function usePracticeSets() {
  const id = useStudentId();
  return useQuery({ queryKey: practiceSetsKey(id), queryFn: () => practiceSetService.list(id) });
}

export function usePracticeSetActions() {
  const id = useStudentId();
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: practiceSetsKey(id) });
  return {
    create: useMutation({ mutationFn: (v: { name: string; questionIds?: string[]; kind?: Parameters<typeof practiceSetService.create>[3] }) => practiceSetService.create(id, v.name, v.questionIds, v.kind), onSuccess: done }),
    add: useMutation({ mutationFn: (v: { setId: string; questionIds: string[] }) => practiceSetService.add(id, v.setId, v.questionIds), onSuccess: done }),
    removeQuestion: useMutation({ mutationFn: (v: { setId: string; questionId: string }) => practiceSetService.removeQuestion(id, v.setId, v.questionId), onSuccess: done }),
    rename: useMutation({ mutationFn: (v: { setId: string; name: string }) => practiceSetService.rename(id, v.setId, v.name), onSuccess: done }),
    remove: useMutation({ mutationFn: (setId: string) => practiceSetService.remove(id, setId), onSuccess: done }),
  };
}
