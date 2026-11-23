import type { AttemptAnswer, Bookmark, ContentReport, PracticeSet, Question } from "@/contracts";
import { chapters, subjects, topics } from "@/mock-data/curriculum";
import { questions as seedQuestions } from "@/mock-data/questions";
import { hashString, rng, SEED_EPOCH } from "@/mock-data/utils";
import { createMockRepository, matchesSearch, queryItems, type ListParams, type Paginated } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { registerSearchProvider, scoreText } from "./search.service";

/**
 * Every topic gets at least two simple synthetic items so each chapter has practice material
 * (the richer hand-written/generated items in mock-data/questions.ts take priority).
 */
function topicFillers(existing: Question[]): Question[] {
  const covered = new Set(existing.map((q) => q.topicId));
  const out: Question[] = [];
  for (const t of topics) {
    if (covered.has(t.id)) continue;
    const chapter = chapters.find((c) => c.id === t.chapterId)!;
    const subject = subjects.find((s) => s.id === t.subjectId)!;
    const r = rng(`filler-${t.id}`);
    const others = r.shuffle(topics.filter((x) => x.subjectId !== t.subjectId)).slice(0, 3);
    const options = r.shuffle([t, ...others]).map((x, i) => ({ id: ["a", "b", "c", "d"][i], text: x.title.bn }));
    const correct = options.find((o) => o.text === t.title.bn)!.id;
    const h = hashString(t.id);
    const base = {
      levelCode: subject.levelCode,
      subjectId: t.subjectId,
      chapterId: t.chapterId,
      topicId: t.id,
      outcomeId: `${t.id}-o1`,
      difficulty: (["easy", "medium", "hard"] as const)[h % 3],
      source: { kind: "synthetic" as const, label: "কৃত্রিম নমুনা · অধ্যায়ভিত্তিক" },
      provenance: "synthetic_sample" as const,
      verification: h % 4 === 0 ? ("partially_verified" as const) : ("verified" as const),
      examRelevance: chapter.examRelevance,
      frequency: 1 + (h % 5),
      tags: [chapter.title.bn],
      status: "published" as const,
      version: 1,
      createdAt: SEED_EPOCH,
      updatedAt: SEED_EPOCH,
    };
    out.push({
      ...base,
      id: `q-fill-${t.id}-mcq`,
      type: "mcq",
      stem: `“${chapter.title.bn}” অধ্যায়ের অন্তর্ভুক্ত টপিক কোনটি?`,
      options,
      correctOptionId: correct,
      answer: t.title.bn,
      explanation: `“${t.title.bn}” টপিকটি ${subject.name.bn}-এর “${chapter.title.bn}” অধ্যায়ে আলোচিত হয়েছে। অন্য বিকল্পগুলো ভিন্ন বিষয়ের টপিক।`,
      marks: 1,
    });
    out.push({
      ...base,
      id: `q-fill-${t.id}-short`,
      type: "short",
      stem: `${t.title.bn} — সংক্ষেপে ব্যাখ্যা করো। (${t.title.en})`,
      answer: `${t.title.bn} হলো ${chapter.title.bn} অধ্যায়ের একটি মূল ধারণা। উত্তরে সংজ্ঞা, একটি উদাহরণ এবং বাস্তব প্রয়োগ উল্লেখ করতে হবে।`,
      explanation: "উত্তরের কাঠামো: সংজ্ঞা → ব্যাখ্যা → উদাহরণ → প্রয়োগ। মডেল উত্তরটি কৃত্রিম নমুনা; পাঠ্যবইয়ের সাথে মিলিয়ে নাও।",
      steps: ["সংজ্ঞা লেখো", "মূল বৈশিষ্ট্য ব্যাখ্যা করো", "একটি উদাহরণ দাও", "বাস্তব প্রয়োগ উল্লেখ করো"],
      rubric: [
        { criterion: "সঠিক সংজ্ঞা", marks: 1 },
        { criterion: "উদাহরণসহ ব্যাখ্যা", marks: 1 },
      ],
      marks: 2,
    });
  }
  return out;
}

export const questionsRepo = createMockRepository<Question>({
  collection: "questions",
  seed: () => {
    const base = seedQuestions;
    return [...base, ...topicFillers(base)];
  },
  searchFields: ["stem", "answer", "tags", "passage", "cqParts"],
  entity: "Question",
  idPrefix: "q",
  latency: 150,
});

const bookmarkRepos = new Map<string, ReturnType<typeof createMockRepository<Bookmark>>>();
const setRepos = new Map<string, ReturnType<typeof createMockRepository<PracticeSet>>>();

export function bookmarksRepo(studentId: string) {
  let r = bookmarkRepos.get(studentId);
  if (!r) {
    r = createMockRepository<Bookmark>({
      collection: `bookmarks:${studentId}`,
      timestamps: false,
      searchFields: ["title", "subtitle"],
      defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
      seed: () =>
        studentId === "u-student-1"
          ? [
              { id: "bm-1", kind: "question", refId: "q-phy-001", title: "গাড়ির ত্বরণ নির্ণয় (MCQ)", subtitle: "পদার্থবিজ্ঞান · গতি", href: "/student/questions?q=q-phy-001", createdAt: SEED_EPOCH },
              { id: "bm-2", kind: "question", refId: "q-phy-002", title: "ব্রেক কষে থামা গাড়ি (সৃজনশীল)", subtitle: "পদার্থবিজ্ঞান · বল", href: "/student/questions?q=q-phy-002", createdAt: SEED_EPOCH },
            ]
          : [],
    });
    bookmarkRepos.set(studentId, r);
  }
  return r;
}

export function practiceSetsRepo(studentId: string) {
  let r = setRepos.get(studentId);
  if (!r) {
    r = createMockRepository<PracticeSet>({
      collection: `practiceSets:${studentId}`,
      searchFields: ["name"],
      defaultSort: { sortBy: "updatedAt", sortOrder: "desc" },
      seed: () =>
        studentId === "u-student-1"
          ? [{ id: "ps-1", name: "গতি ও বল — কঠিন প্রশ্ন", questionIds: ["q-phy-001", "q-phy-002"], kind: "manual", createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH }]
          : [],
    });
    setRepos.set(studentId, r);
  }
  return r;
}

export const reportsRepo = createMockRepository<ContentReport>({
  collection: "contentReports",
  timestamps: false,
  searchFields: ["reason", "details", "refId"],
  defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
  seed: () => [
    { id: "rep-1", kind: "question", refId: "q-chem-003", reason: "ভুল উত্তর", details: "অপশন খ সঠিক হওয়া উচিত", reporterId: "u-gen-6", status: "open", createdAt: SEED_EPOCH },
    { id: "rep-2", kind: "ai_answer", refId: "msg-demo", reason: "উৎস মিলছে না", reporterId: "u-student-1", status: "in_review", createdAt: SEED_EPOCH },
  ],
});

// ---------------------------------------------------------------- Grading

const norm = (s: string) => s.toLocaleLowerCase().replace(/\s+/g, " ").trim();

/** Local, deterministic grading for objective types (EXM-44). Returns null for subjective types. */
export function gradeObjective(q: Question, a: AttemptAnswer | undefined): boolean | null {
  switch (q.type) {
    case "mcq":
      return !!a?.optionId && a.optionId === q.correctOptionId;
    case "true_false":
      return a?.booleanValue !== undefined && a.booleanValue === q.correctBoolean;
    case "fill_blank":
      return !!q.blanks?.length && q.blanks.every((accepted, i) => accepted.some((x) => norm(x) === norm(a?.blanks?.[i] ?? "")));
    case "matching":
      return !!q.matchingPairs?.length && q.matchingPairs.every((p) => a?.matches?.[p.left] === p.right);
    case "numerical":
      if (!q.numericAnswer || a?.numeric === undefined || Number.isNaN(a.numeric)) return a?.optionId ? a.optionId === q.correctOptionId : false;
      return Math.abs(a.numeric - q.numericAnswer.value) <= q.numericAnswer.tolerance;
    default:
      if (q.options?.length && q.correctOptionId) return a?.optionId === q.correctOptionId;
      return null;
  }
}

export function isAnswered(q: Question, a: AttemptAnswer | undefined): boolean {
  if (!a) return false;
  return !!(
    a.optionId ||
    a.booleanValue !== undefined ||
    a.text?.trim() ||
    a.blanks?.some((b) => b.trim()) ||
    (a.matches && Object.keys(a.matches).length) ||
    (a.numeric !== undefined && !Number.isNaN(a.numeric)) ||
    a.uploadNames?.length
  );
}

/**
 * Simulated, explicitly non-authoritative estimate for written answers (EXM-45):
 * keyword overlap with the model answer, scaled to the marks.
 */
export function estimateWritten(q: Question, text: string): { marks: number; feedback: string } {
  const words = (s: string) => new Set(norm(s.replace(/[$\\{}^_().,;:।?!*]/g, " ")).split(" ").filter((w) => w.length > 2));
  const model = words(q.answer + " " + (q.cqParts?.map((p) => p.answer).join(" ") ?? ""));
  const mine = words(text);
  if (!mine.size) return { marks: 0, feedback: "উত্তর খালি।" };
  let hit = 0;
  for (const w of model) if (mine.has(w)) hit++;
  const ratio = Math.min(1, hit / Math.max(4, model.size * 0.6));
  const lengthBonus = Math.min(0.15, text.length / 4000);
  const marks = Math.round(Math.min(1, ratio + lengthBonus) * q.marks * 2) / 2;
  return {
    marks,
    feedback:
      ratio > 0.7
        ? "মূল ধারণাগুলো এসেছে। উপস্থাপনা আরও গোছালো করো।"
        : ratio > 0.35
          ? "কিছু গুরুত্বপূর্ণ পয়েন্ট বাদ পড়েছে — মডেল উত্তরের সাথে মিলিয়ে দেখো।"
          : "উত্তরে মূল ধারণাগুলো অনুপস্থিত। অধ্যায়টি আবার পড়ো।",
  };
}

// ---------------------------------------------------------------- Queries

export interface QuestionFilters {
  levelCode?: string;
  grade?: number;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  outcomeId?: string;
  types?: string[];
  difficulty?: string[];
  sourceKind?: string;
  year?: number;
  boardId?: string;
  marks?: number[];
  verification?: string[];
  examRelevance?: string[];
}

export function filterQuestions(items: Question[], f: QuestionFilters, search?: string) {
  return items.filter(
    (q) =>
      q.status === "published" &&
      (!f.levelCode || q.levelCode === f.levelCode) &&
      (!f.subjectId || q.subjectId === f.subjectId) &&
      (!f.chapterId || q.chapterId === f.chapterId) &&
      (!f.topicId || q.topicId === f.topicId) &&
      (!f.outcomeId || q.outcomeId === f.outcomeId || (!q.outcomeId && q.topicId === f.outcomeId.replace(/-o\d$/, ""))) &&
      (!f.types?.length || f.types.includes(q.type)) &&
      (!f.difficulty?.length || f.difficulty.includes(q.difficulty)) &&
      (!f.sourceKind || (f.sourceKind === "board" ? !!q.source.boardId : f.sourceKind === "other" ? !q.source.boardId : q.source.kind === f.sourceKind)) &&
      (!f.year || q.source.year === f.year) &&
      (!f.boardId || q.source.boardId === f.boardId) &&
      (!f.marks?.length || f.marks.includes(q.marks)) &&
      (!f.verification?.length || f.verification.includes(q.verification)) &&
      (!f.examRelevance?.length || f.examRelevance.includes(q.examRelevance)) &&
      matchesSearch(q, search, ["stem", "answer", "tags", "passage"]),
  );
}

const DIFF_ORDER = { easy: 1, medium: 2, hard: 3 };

export const questionService = {
  async browse(filters: QuestionFilters, params: Pick<ListParams, "search" | "page" | "pageSize"> & { sort?: "recent" | "difficulty" | "frequency" }): Promise<Paginated<Question>> {
    await mockRequest(180);
    let items = filterQuestions(await questionsRepo.raw(), filters, params.search);
    if (params.sort === "difficulty") items = [...items].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    else if (params.sort === "frequency") items = [...items].sort((a, b) => b.frequency - a.frequency);
    else items = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || Number(a.id.startsWith("q-fill")) - Number(b.id.startsWith("q-fill")) || a.id.localeCompare(b.id));
    return queryItems(items, { page: params.page, pageSize: params.pageSize ?? 1000 });
  },
  get: (id: string) => questionsRepo.get(id),
  async many(ids: string[]) {
    const all = await questionsRepo.raw();
    const map = new Map(all.map((q) => [q.id, q]));
    return ids.map((id) => map.get(id)).filter((q): q is Question => !!q);
  },
  async related(q: Question, limit = 4) {
    const all = await questionsRepo.raw();
    return all.filter((x) => x.id !== q.id && x.status === "published" && x.topicId === q.topicId).slice(0, limit);
  },
  async similar(q: Question, limit = 4) {
    const all = await questionsRepo.raw();
    const tags = new Set(q.tags);
    return all
      .filter((x) => x.id !== q.id && x.status === "published" && x.chapterId === q.chapterId && x.topicId !== q.topicId)
      .map((x) => ({ x, score: (x.type === q.type ? 2 : 0) + x.tags.filter((t) => tags.has(t)).length + (x.difficulty === q.difficulty ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.x);
  },
  async countsByChapter(): Promise<Record<string, number>> {
    const all = await questionsRepo.raw();
    const out: Record<string, number> = {};
    for (const q of all) if (q.status === "published") out[q.chapterId] = (out[q.chapterId] ?? 0) + 1;
    return out;
  },
  async report(input: Omit<ContentReport, "id" | "status" | "createdAt">) {
    await mockRequest(300);
    return reportsRepo.create({ ...input, id: newId("rep"), status: "open", createdAt: nowIso() });
  },
  /** Builds a random set for quizzes / practice / custom exams. */
  async pick(filters: QuestionFilters, count: number, seed = Date.now().toString()) {
    const pool = filterQuestions(await questionsRepo.raw(), filters);
    return rng(seed).shuffle(pool).slice(0, count);
  },
};

export const bookmarkService = {
  list: (studentId: string) => bookmarksRepo(studentId).all(),
  async toggle(studentId: string, input: Omit<Bookmark, "id" | "createdAt">) {
    const repo = bookmarksRepo(studentId);
    const existing = (await repo.raw()).find((b) => b.kind === input.kind && b.refId === input.refId);
    if (existing) {
      await repo.remove(existing.id);
      return false;
    }
    await repo.create({ ...input, id: newId("bm"), createdAt: nowIso() });
    return true;
  },
  remove: (studentId: string, id: string) => bookmarksRepo(studentId).remove(id),
};

export const practiceSetService = {
  list: (studentId: string) => practiceSetsRepo(studentId).all(),
  create: (studentId: string, name: string, questionIds: string[] = [], kind: PracticeSet["kind"] = "manual") =>
    practiceSetsRepo(studentId).create({ id: newId("ps"), name, questionIds, kind, createdAt: nowIso(), updatedAt: nowIso() }),
  async add(studentId: string, setId: string, questionIds: string[]) {
    const repo = practiceSetsRepo(studentId);
    const set = await repo.get(setId);
    return repo.update(setId, { questionIds: [...new Set([...set.questionIds, ...questionIds])] });
  },
  async removeQuestion(studentId: string, setId: string, questionId: string) {
    const repo = practiceSetsRepo(studentId);
    const set = await repo.get(setId);
    return repo.update(setId, { questionIds: set.questionIds.filter((x) => x !== questionId) });
  },
  rename: (studentId: string, setId: string, name: string) => practiceSetsRepo(studentId).update(setId, { name }),
  remove: (studentId: string, setId: string) => practiceSetsRepo(studentId).remove(setId),
};

registerSearchProvider("question", async (q) => {
  const all = await questionsRepo.raw();
  return all
    .filter((x) => x.status === "published" && matchesSearch(x, q, ["stem", "tags", "answer"]))
    .slice(0, 40)
    .map((x) => ({
      kind: "question" as const,
      id: x.id,
      title: { bn: x.stem.replace(/[$*\\]/g, "").slice(0, 90), en: x.stem.replace(/[$*\\]/g, "").slice(0, 90) },
      subtitle: chapters.find((c) => c.id === x.chapterId)?.title,
      href: `/student/questions?q=${x.id}`,
      score: scoreText(x.stem, q) - 10,
      subjectId: x.subjectId,
      chapterId: x.chapterId,
    }));
});
