import type { Bilingual } from "@/contracts";
import { matchesSearch, normalizeSearch } from "./core/repository";
import { mockRequest } from "./core/mock-runtime";
import { curriculumRepos } from "./curriculum.service";

export type SearchKind =
  | "subject"
  | "chapter"
  | "topic"
  | "question"
  | "book"
  | "board_paper"
  | "institution_paper"
  | "note"
  | "flashcard"
  | "conversation"
  | "audio";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: Bilingual;
  subtitle?: Bilingual;
  href: string;
  score: number;
  subjectId?: string;
  chapterId?: string;
}

export type SearchProvider = (q: string) => Promise<SearchHit[]>;

const providers = new Map<SearchKind, SearchProvider>();

/** Domain services register a provider for their content type (keeps search decoupled). */
export function registerSearchProvider(kind: SearchKind, provider: SearchProvider) {
  providers.set(kind, provider);
}

/** Ranks a hit: exact title > title prefix > title contains > body match. */
export function scoreText(title: string, q: string): number {
  const t = normalizeSearch(title);
  const n = normalizeSearch(q);
  if (t === n) return 100;
  if (t.startsWith(n)) return 80;
  if (t.includes(n)) return 60;
  return 30;
}

const bi = (bn: string, en: string): Bilingual => ({ bn, en });

registerSearchProvider("subject", async (q) => {
  const items = await curriculumRepos.subjects.raw();
  return items
    .filter((s) => matchesSearch(s, q, ["name.bn", "name.en", "code"]))
    .map((s) => ({ kind: "subject" as const, id: s.id, title: s.name, subtitle: bi(s.levelCode, s.levelCode), href: `/student/curriculum/${s.id}`, score: scoreText(s.name.bn + " " + s.name.en, q) + 10, subjectId: s.id }));
});

registerSearchProvider("chapter", async (q) => {
  const [items, subjects] = await Promise.all([curriculumRepos.chapters.raw(), curriculumRepos.subjects.raw()]);
  const subj = new Map(subjects.map((s) => [s.id, s]));
  return items
    .filter((c) => matchesSearch(c, q, ["title.bn", "title.en"]))
    .map((c) => ({ kind: "chapter" as const, id: c.id, title: c.title, subtitle: subj.get(c.subjectId)?.name, href: `/student/curriculum/${c.subjectId}/${c.id}`, score: scoreText(c.title.bn + " " + c.title.en, q) + 5, subjectId: c.subjectId, chapterId: c.id }));
});

registerSearchProvider("topic", async (q) => {
  const [items, chapters] = await Promise.all([curriculumRepos.topics.raw(), curriculumRepos.chapters.raw()]);
  const ch = new Map(chapters.map((c) => [c.id, c]));
  return items
    .filter((t) => matchesSearch(t, q, ["title.bn", "title.en"]))
    .map((t) => ({ kind: "topic" as const, id: t.id, title: t.title, subtitle: ch.get(t.chapterId)?.title, href: `/student/curriculum/${t.subjectId}/${t.chapterId}#${t.id}`, score: scoreText(t.title.bn + " " + t.title.en, q), subjectId: t.subjectId, chapterId: t.chapterId }));
});

export const searchService = {
  /** Palette search: top results across all registered kinds. */
  async quick(q: string, limit = 8): Promise<SearchHit[]> {
    const hits = await searchService.all(q);
    return hits.slice(0, limit);
  },

  async all(q: string, kinds?: SearchKind[]): Promise<SearchHit[]> {
    if (q.trim().length < 2) return [];
    await mockRequest(150);
    const lists = await Promise.all(
      [...providers.entries()].filter(([kind]) => !kinds?.length || kinds.includes(kind)).map(([, p]) => p(q).catch(() => [])),
    );
    return lists.flat().sort((a, b) => b.score - a.score);
  },
};
