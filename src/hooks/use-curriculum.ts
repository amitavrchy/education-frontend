"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Chapter, Subject, Topic } from "@/contracts";
import { curriculumService, type CurriculumSnapshot } from "@/services/curriculum.service";

export const curriculumKey = ["curriculum"] as const;

export interface CurriculumIndex extends CurriculumSnapshot {
  subject: (id?: string) => Subject | undefined;
  chapter: (id?: string) => Chapter | undefined;
  topic: (id?: string) => Topic | undefined;
  chaptersOf: (subjectId: string) => Chapter[];
  topicsOf: (chapterId: string) => Topic[];
  boardName: (id?: string) => { bn: string; en: string } | undefined;
}

export function buildCurriculumIndex(s: CurriculumSnapshot): CurriculumIndex {
  const subjects = new Map(s.subjects.map((x) => [x.id, x]));
  const chapters = new Map(s.chapters.map((x) => [x.id, x]));
  const topics = new Map(s.topics.map((x) => [x.id, x]));
  const bySubject = new Map<string, Chapter[]>();
  for (const c of s.chapters) bySubject.set(c.subjectId, [...(bySubject.get(c.subjectId) ?? []), c]);
  for (const list of bySubject.values()) list.sort((a, b) => (a.paperId ?? "").localeCompare(b.paperId ?? "") || a.number - b.number);
  const byChapter = new Map<string, Topic[]>();
  for (const t of s.topics) byChapter.set(t.chapterId, [...(byChapter.get(t.chapterId) ?? []), t]);
  for (const list of byChapter.values()) list.sort((a, b) => a.order - b.order);
  const boards = new Map(s.boards.map((b) => [b.id, b.name]));
  return {
    ...s,
    subject: (id) => (id ? subjects.get(id) : undefined),
    chapter: (id) => (id ? chapters.get(id) : undefined),
    topic: (id) => (id ? topics.get(id) : undefined),
    chaptersOf: (subjectId) => bySubject.get(subjectId) ?? [],
    topicsOf: (chapterId) => byChapter.get(chapterId) ?? [],
    boardName: (id) => (id ? boards.get(id) : undefined),
  };
}

/** Curriculum tree + lookup helpers. Data is static-ish, so it is cached for the session. */
export function useCurriculum() {
  const query = useQuery({ queryKey: curriculumKey, queryFn: curriculumService.snapshot, staleTime: 10 * 60_000 });
  const index = useMemo(() => (query.data ? buildCurriculumIndex(query.data) : undefined), [query.data]);
  return { ...query, index };
}
