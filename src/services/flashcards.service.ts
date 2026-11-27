import type { Flashcard, FlashcardDeck } from "@/contracts";
import { chapters, subjects, topics } from "@/mock-data/curriculum";
import { scenarios } from "@/mock-data/tutor-scenarios";
import { daysFromNow, rng } from "@/mock-data/utils";
import { createMockRepository, matchesSearch } from "./core/repository";
import { isRemote, remote } from "./core/remote";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { progressService } from "./progress.service";
import { questionsRepo } from "./question.service";
import { registerSearchProvider, scoreText } from "./search.service";

export type Rating = "again" | "hard" | "medium" | "easy";

/** Upper bound so repeated "easy" ratings cannot overflow the due date. */
export const MAX_INTERVAL_DAYS = 365;

/**
 * SM-2-lite scheduling (FC-13): ease 1.3–2.8; "again" resets, others grow the interval.
 * Pure so it is unit-tested.
 */
export function schedule(card: Pick<Flashcard, "ease" | "intervalDays" | "repetitions" | "lapses">, rating: Rating, now = new Date()) {
  let { ease, intervalDays, repetitions, lapses } = card;
  if (rating === "again") {
    repetitions = 0;
    lapses += 1;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    const q = { hard: 3, medium: 4, easy: 5 }[rating];
    ease = Math.min(2.8, Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));
    repetitions += 1;
    intervalDays = repetitions === 1 ? (rating === "easy" ? 3 : 1) : repetitions === 2 ? (rating === "hard" ? 3 : 6) : Math.min(MAX_INTERVAL_DAYS, Math.round(intervalDays * ease * (rating === "hard" ? 0.8 : rating === "easy" ? 1.3 : 1)));
  }
  const due = new Date(now);
  if (intervalDays === 0) due.setMinutes(due.getMinutes() + 10);
  else due.setDate(due.getDate() + intervalDays);
  return { ease: Math.round(ease * 100) / 100, intervalDays, repetitions, lapses, dueAt: due.toISOString() };
}

const plain = (s: string) => s.replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");

function cardsFromChapter(deckId: string, chapterId: string): Omit<Flashcard, "id" | "createdAt" | "updatedAt">[] {
  const sc = scenarios.filter((s) => s.chapterId === chapterId);
  const base = { deckId, tags: [] as string[], bookmarked: false, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: nowIso() };
  const out = sc.flatMap((s) => [
    { ...base, front: `${s.title.bn} কাকে বলে?`, back: s.definition.bn, hint: s.analogy.bn, tags: [s.title.bn] },
    ...(s.formula ? [{ ...base, front: `${s.title.bn}-এর সূত্র কী?`, back: `$${plain(s.formula.tex)}$`, tags: ["সূত্র"] }] : []),
    { ...base, front: `ভুল ধারণা শনাক্ত করো: ${s.title.bn}`, back: s.misconception.bn, tags: ["ভুল ধারণা"] },
  ]);
  for (const t of topics.filter((x) => x.chapterId === chapterId)) out.push({ ...base, front: `${t.title.bn} — মূল ধারণা কী?`, back: `${t.title.en}: সংজ্ঞা, একটি উদাহরণ ও একটি প্রয়োগ মনে রাখো। (কৃত্রিম ডেমো কার্ড)`, hint: undefined, tags: [t.title.bn] });
  return out;
}

function seed(studentId: string): { decks: FlashcardDeck[]; cards: Flashcard[] } {
  if (studentId !== "u-student-1") return { decks: [], cards: [] };
  const r = rng("fc-seed");
  const decks: FlashcardDeck[] = [
    { id: "deck-1", name: "গতি ও বল", subjectId: "ssc-physics", chapterId: "ssc-physics-c2", source: "chapter", color: "#2563eb", offline: true, createdAt: daysFromNow(-20) },
    { id: "deck-2", name: "মোল ধারণা", subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c6", source: "chapter", color: "#9333ea", offline: false, createdAt: daysFromNow(-15) },
    { id: "deck-3", name: "English vocabulary", source: "english_vocab", color: "#4f46e5", offline: false, createdAt: daysFromNow(-8) },
  ];
  const stamp = nowIso();
  const cards: Flashcard[] = [
    ...cardsFromChapter("deck-1", "ssc-physics-c2"),
    ...cardsFromChapter("deck-1", "ssc-physics-c3"),
    ...cardsFromChapter("deck-2", "ssc-chemistry-c6"),
    ...[["abundant", "প্রচুর (plentiful)"], ["diligent", "পরিশ্রমী (hard-working)"], ["inevitable", "অনিবার্য (unavoidable)"], ["meticulous", "অতি যত্নশীল (very careful)"], ["resilient", "সহনশীল (recovers quickly)"], ["scarce", "দুষ্প্রাপ্য (in short supply)"]].map(([front, back]) => ({ deckId: "deck-3", front, back, tags: ["vocabulary"], bookmarked: false, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: stamp })),
  ].map((c, i) => {
    const reviewed = r.bool(0.6);
    const reps = reviewed ? r.int(1, 4) : 0;
    const interval = reps ? [1, 3, 6, 14][reps - 1] : 0;
    return { ...c, id: `fc-${i + 1}`, repetitions: reps, intervalDays: interval, ease: reps ? 2.3 + r.int(0, 4) / 10 : 2.5, dueAt: daysFromNow(reps ? r.int(-3, 6) : 0), lastReviewedAt: reps ? daysFromNow(-r.int(1, 6)) : undefined, lastRating: reps ? r.pick(["hard", "medium", "easy"] as const) : undefined, known: reps >= 3, bookmarked: i % 7 === 0, createdAt: daysFromNow(-20), updatedAt: daysFromNow(-1) };
  });
  return { decks, cards };
}

const repos = new Map<string, { decks: ReturnType<typeof createMockRepository<FlashcardDeck>>; cards: ReturnType<typeof createMockRepository<Flashcard>> }>();
export function flashcardRepos(studentId: string) {
  let x = repos.get(studentId);
  if (!x) {
    let s: ReturnType<typeof seed> | null = null;
    const get = () => (s ??= seed(studentId));
    x = {
      decks: createMockRepository<FlashcardDeck>({ collection: `decks:${studentId}`, seed: () => get().decks, timestamps: false, searchFields: ["name"] }),
      cards: createMockRepository<Flashcard>({ collection: `cards:${studentId}`, seed: () => get().cards, searchFields: ["front", "back", "tags"], latency: 80 }),
    };
    repos.set(studentId, x);
  }
  return x;
}

const COLORS = ["#2563eb", "#9333ea", "#16a34a", "#ea580c", "#0891b2", "#be123c"];

export const flashcardService = {
  decks: (studentId: string) => flashcardRepos(studentId).decks.all(),
  cards: (studentId: string) => flashcardRepos(studentId).cards.all(),

  async createDeck(studentId: string, input: Pick<FlashcardDeck, "name" | "source"> & Partial<FlashcardDeck>) {
    const decks = await flashcardRepos(studentId).decks.raw();
    return flashcardRepos(studentId).decks.create({ id: newId("deck"), color: COLORS[decks.length % COLORS.length], offline: false, createdAt: nowIso(), ...input });
  },
  updateDeck: (studentId: string, id: string, patch: Partial<FlashcardDeck>) => flashcardRepos(studentId).decks.update(id, patch),
  async removeDeck(studentId: string, id: string) {
    const cards = flashcardRepos(studentId).cards;
    await cards.bulkRemove((await cards.raw()).filter((c) => c.deckId === id).map((c) => c.id));
    await flashcardRepos(studentId).decks.remove(id);
  },
  addCard: (studentId: string, deckId: string, front: string, back: string, hint?: string, tags: string[] = []) =>
    flashcardRepos(studentId).cards.create({ id: newId("fc"), deckId, front, back, hint, tags, bookmarked: false, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso() }),
  updateCard: (studentId: string, id: string, patch: Partial<Flashcard>) => flashcardRepos(studentId).cards.update(id, patch),
  removeCard: (studentId: string, id: string) => flashcardRepos(studentId).cards.remove(id),

  async review(studentId: string, card: Flashcard, rating: Rating) {
    const next = schedule(card, rating);
    const updated = await flashcardRepos(studentId).cards.update(card.id, { ...next, lastReviewedAt: nowIso(), lastRating: rating, known: rating === "easy" || next.repetitions >= 3 });
    return updated;
  },
  async finishSession(studentId: string, reviewed: number, minutes: number) {
    if (!reviewed) return;
    await progressService.logActivity(studentId, { kind: "flashcards", minutes: Math.max(1, minutes), label: `${reviewed}টি ফ্ল্যাশকার্ড রিভিশন`, xp: reviewed * 3 });
    const total = (await flashcardRepos(studentId).cards.raw()).filter((c) => c.lastReviewedAt).length;
    if (total >= 50) await progressService.grantBadge(studentId, "flashcard-50");
  },

  /** Deck for a chapter: the AI writes it from the textbook passages in API mode (offline: from the outline). */
  async generateFromChapter(studentId: string, chapterId: string) {
    await mockRequest(900);
    const ch = chapters.find((c) => c.id === chapterId);
    const deck = await flashcardService.createDeck(studentId, { name: ch ? `${ch.title.bn} (AI)` : "AI ডেক", source: "ai", subjectId: ch?.subjectId, chapterId });
    const repo = flashcardRepos(studentId).cards;
    const stamp = nowIso();
    const drafts = isRemote()
      ? (await remote.post<{ cards: { front: string; back: string; hint?: string; tags: string[] }[] }>(`/flashcards/${studentId}/generate`, { chapterId, count: 12 })).cards.map((c) => ({
          deckId: deck.id, front: c.front, back: c.back, hint: c.hint, tags: c.tags, bookmarked: false, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: stamp,
        }))
      : cardsFromChapter(deck.id, chapterId);
    const cards = drafts.map((c) => ({ ...c, id: newId("fc"), createdAt: stamp, updatedAt: stamp }));
    await repo.replaceAll([...cards, ...(await repo.raw())]);
    return { deck, count: cards.length };
  },

  /** Deck from a note, a tutor conversation or pasted text: written by the AI in API mode. */
  async generateFromText(studentId: string, name: string, source: FlashcardDeck["source"], text: string, subjectId?: string) {
    await mockRequest(700);
    if (isRemote()) {
      const plain = text.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      const res = await remote.post<{ cards: { front: string; back: string; hint?: string; tags: string[] }[] }>(`/flashcards/${studentId}/generate`, { sourceText: plain.slice(0, 30_000), title: name, count: 12 });
      const deck = await flashcardService.createDeck(studentId, { name, source, subjectId });
      const stamp = nowIso();
      const cards = res.cards.map((c) => ({ id: newId("fc"), deckId: deck.id, front: c.front, back: c.back, hint: c.hint, tags: c.tags, bookmarked: false, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: stamp, createdAt: stamp, updatedAt: stamp }));
      const repo = flashcardRepos(studentId).cards;
      await repo.replaceAll([...cards, ...(await repo.raw())]);
      return { deck, count: cards.length };
    }
    const deck = await flashcardService.createDeck(studentId, { name, source, subjectId });
    const sentences = text
      .replace(/<[^>]+>/g, "\n")
      .split(/\n|।|\.(?=\s)/)
      .map((s) => s.replace(/^[#>*\-\s\d.)]+/, "").trim())
      .filter((s) => s.length > 12 && s.length < 220)
      .slice(0, 12);
    const stamp = nowIso();
    const cards = sentences.map((s, i) => {
      const [head, ...rest] = s.split(/[:—–]/);
      const front = rest.length ? `${head.trim()} — ব্যাখ্যা করো` : `মনে আছে? (${i + 1})`;
      return { id: newId("fc"), deckId: deck.id, front, back: rest.length ? rest.join(":").trim() : s, tags: [], bookmarked: false, ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: stamp, createdAt: stamp, updatedAt: stamp };
    });
    const repo = flashcardRepos(studentId).cards;
    await repo.replaceAll([...cards, ...(await repo.raw())]);
    return { deck, count: cards.length };
  },

  /** FC-06: deck from questions the student got wrong. */
  async generateFromIncorrect(studentId: string) {
    await mockRequest(700);
    const attempts = (await progressService.attempts(studentId)).filter((a) => !a.correct).slice(0, 40);
    const all = await questionsRepo.raw();
    const picked = new Map<string, (typeof all)[number]>();
    for (const a of attempts) {
      const q = all.find((x) => x.id === a.questionId) ?? all.find((x) => x.topicId === a.topicId && x.type === "mcq");
      if (q) picked.set(q.id, q);
      if (picked.size >= 12) break;
    }
    const deck = await flashcardService.createDeck(studentId, { name: "ভুল প্রশ্ন রিভিশন", source: "incorrect" });
    const stamp = nowIso();
    const cards = [...picked.values()].map((q) => ({ id: newId("fc"), deckId: deck.id, front: q.stem, back: `${q.answer}\n\n${q.explanation}`, tags: [subjects.find((s) => s.id === q.subjectId)?.name.bn ?? ""], bookmarked: false, ease: 2.3, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: stamp, createdAt: stamp, updatedAt: stamp }));
    const repo = flashcardRepos(studentId).cards;
    await repo.replaceAll([...cards, ...(await repo.raw())]);
    return { deck, count: cards.length };
  },
};

registerSearchProvider("flashcard", async (q) => {
  const id = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("shikkhaai-auth") ?? "{}")?.state?.user?.id : undefined;
  if (!id) return [];
  return (await flashcardRepos(id).cards.raw())
    .filter((c) => matchesSearch(c, q, ["front", "back", "tags"]))
    .slice(0, 20)
    .map((c) => ({ kind: "flashcard" as const, id: c.id, title: { bn: c.front.replace(/\$/g, ""), en: c.front.replace(/\$/g, "") }, subtitle: { bn: "ফ্ল্যাশকার্ড", en: "Flashcard" }, href: `/student/flashcards?deck=${c.deckId}&q=${encodeURIComponent(c.front.slice(0, 30))}`, score: scoreText(c.front, q) - 5 }));
});
