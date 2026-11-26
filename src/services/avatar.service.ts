import type { AvatarAppearance, AvatarMessage, AvatarReport, AvatarSession, Book, BookAvatar } from "@/contracts";
import { books } from "@/mock-data/books";
import { hashString } from "@/mock-data/utils";
import { answerFromBook } from "./ai/book-avatar-engine";
import { createMockRepository } from "./core/repository";
import { isRemote, remote } from "./core/remote";

import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { booksRepo } from "./library.service";

/**
 * Per-book 2D teacher avatars (frontend mock). Every book gets one avatar, created automatically when
 * an admin uploads a book. Students talk to it by text or voice; it answers only from that book.
 */

const SKIN = ["#F2C9A0", "#E0AC7E", "#C68B5E", "#A86F4A", "#8D5A3B"];
const HAIR = ["#1F1A17", "#2E2420", "#4A3426", "#6B4A35", "#8A8A8A"];
const OUTFIT = ["#0F766E", "#1D4ED8", "#7C3AED", "#B45309", "#BE123C", "#334155", "#15803D"];
const BG = ["#E6F4F1", "#E8EEFB", "#F1ECFB", "#FBF1E4", "#FCE9EE", "#EEF2F6"];

const FEMALE_NAMES: [string, string][] = [
  ["নাসরিন আপা", "Nasrin Apa"],
  ["ফারহানা ম্যাডাম", "Farhana Madam"],
  ["তাহমিনা আপা", "Tahmina Apa"],
  ["রুমানা ম্যাডাম", "Rumana Madam"],
  ["সাবরিনা আপা", "Sabrina Apa"],
];
const MALE_NAMES: [string, string][] = [
  ["রফিক স্যার", "Rafiq Sir"],
  ["মাহফুজ স্যার", "Mahfuz Sir"],
  ["কামাল স্যার", "Kamal Sir"],
  ["আরিফ স্যার", "Arif Sir"],
  ["শফিক স্যার", "Shafiq Sir"],
];

/** hashString with an avalanche finaliser (murmur3 fmix32) so low bits vary too; always unsigned. */
function mixHash(seed: string): number {
  let h = hashString(seed) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function defaultAppearance(seed: string): AvatarAppearance {
  const h = mixHash(seed);
  const gender = h % 2 ? "female" : "male";
  const pick = <T,>(arr: readonly T[], salt: number) => arr[(h >>> salt) % arr.length];
  return {
    gender,
    skinTone: pick(SKIN, 1),
    hairStyle: gender === "female" ? pick(["long", "bun", "hijab", "long"] as const, 3) : pick(["short", "side_part", "short", "bald"] as const, 3),
    hairColor: pick(HAIR, 5),
    outfit: gender === "female" ? pick(["saree", "salwar", "blazer"] as const, 7) : pick(["shirt", "panjabi", "blazer"] as const, 7),
    outfitColor: pick(OUTFIT, 9),
    accentColor: pick(OUTFIT, 11),
    glasses: (h >>> 13) % 3 === 0,
    beard: gender === "male" && (h >>> 15) % 3 === 0,
    background: pick(BG, 17),
  };
}

export function defaultAvatarFor(book: Pick<Book, "id" | "title" | "language" | "subjectId">, status: BookAvatar["status"] = "active"): BookAvatar {
  const appearance = defaultAppearance(book.subjectId + book.id);
  const names = appearance.gender === "female" ? FEMALE_NAMES : MALE_NAMES;
  const [bn, en] = names[mixHash(`name:${book.id}`) % names.length];
  const subjectBn = book.title.bn.replace(/\s*\(.*\)$/, "");
  const subjectEn = book.title.en.replace(/\s*\(.*\)$/, "");
  return {
    id: `av-${book.id}`,
    bookId: book.id,
    name: { bn, en },
    title: { bn: `${subjectBn} শিক্ষক`, en: `${subjectEn} teacher` },
    appearance,
    voice: { language: book.language, rate: 1, pitch: appearance.gender === "female" ? 1.1 : 0.9 },
    greeting: {
      bn: `আসসালামু আলাইকুম! আমি ${bn}। "${book.title.bn}" বইয়ের যেকোনো অধ্যায় থেকে প্রশ্ন করো — লিখে বা কথা বলে। আমি বইয়ের পৃষ্ঠা দেখিয়ে বুঝিয়ে দেব।`,
      en: `Hello! I'm ${en}. Ask me anything from "${book.title.en}" — by typing or speaking. I'll explain using the pages of the book.`,
    },
    persona: { style: "friendly", answerLength: "balanced", useExamples: true },
    scopeChapterIds: [],
    strictBookScope: true,
    status,
    stats: { sessions: 0, questions: 0, outOfScope: 0, helpful: 0, notHelpful: 0 },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function seedAvatars(): BookAvatar[] {
  return books.map((b, i) => {
    const a = defaultAvatarFor(b, b.isLatestEdition ? "active" : "disabled");
    const h = hashString(b.id) >>> 0;
    return { ...a, stats: { sessions: 20 + (h % 400), questions: 80 + (h % 1600), outOfScope: 3 + (h % 40), helpful: 40 + (h % 900), notHelpful: 2 + (h % 60) }, createdAt: "2026-06-01T08:00:00.000Z", updatedAt: i % 3 ? "2026-10-12T08:00:00.000Z" : "2026-11-02T08:00:00.000Z" };
  });
}

export const avatarsRepo = createMockRepository<BookAvatar>({ collection: "bookAvatars", seed: seedAvatars, searchFields: ["name.bn", "name.en", "title.bn", "title.en"], entity: "Avatar", idPrefix: "av" });

const seedReports = (): AvatarReport[] => [
  { id: "ar-1", bookId: "book-ssc-physics-bn", avatarId: "av-book-ssc-physics-bn", studentId: "u-student-1", question: "ত্বরণের একক কী?", answer: "ত্বরণের একক m/s (ডেমো ভুল উত্তর)", reason: "একক ভুল — m/s² হওয়া উচিত", status: "open", createdAt: "2026-11-20T10:00:00.000Z", updatedAt: "2026-11-20T10:00:00.000Z" },
  { id: "ar-2", bookId: "book-ssc-chemistry-bn", avatarId: "av-book-ssc-chemistry-bn", studentId: "u-student-2", question: "মোল কাকে বলে?", answer: "…", reason: "উত্তর অসম্পূর্ণ", status: "open", createdAt: "2026-11-22T12:00:00.000Z", updatedAt: "2026-11-22T12:00:00.000Z" },
  { id: "ar-3", bookId: "book-ssc-math-bn", avatarId: "av-book-ssc-math-bn", studentId: "u-student-1", question: "বর্গের সূত্র", answer: "…", reason: "পৃষ্ঠা নম্বর মেলেনি", status: "resolved", resolution: "পৃষ্ঠা ম্যাপিং ঠিক করা হয়েছে", resolvedBy: "নাসরিন সুলতানা", createdAt: "2026-11-10T09:00:00.000Z", updatedAt: "2026-11-11T09:00:00.000Z" },
];
export const avatarReportsRepo = createMockRepository<AvatarReport>({ collection: "avatarReports", seed: seedReports, searchFields: ["question", "reason"], defaultSort: { sortBy: "createdAt", sortOrder: "desc" } });

const sessionRepos = new Map<string, ReturnType<typeof createMockRepository<AvatarSession>>>();
const messageRepos = new Map<string, ReturnType<typeof createMockRepository<AvatarMessage>>>();

function seedSessionsFor(studentId: string): AvatarSession[] {
  if (studentId !== "u-student-1" && studentId !== "u-student-2") return [];
  const own = studentId === "u-student-1" ? ["book-ssc-physics-bn", "book-ssc-chemistry-bn", "book-ssc-math-bn"] : ["book-hsc-accounting-bn", "book-hsc-finance-bn"];
  return own.map((bookId, i) => ({ id: `as-${studentId}-${i}`, bookId, avatarId: `av-${bookId}`, studentId, title: ["গতি ও ত্বরণ", "মোল ধারণা", "বীজগণিতের সূত্র", "হিসাব সমীকরণ", "সময়মূল্য"][i + (studentId === "u-student-2" ? 3 : 0)] ?? "সেশন", startedAt: `2026-11-${18 + i}T16:00:00.000Z`, lastAt: `2026-11-${18 + i}T16:2${i}:00.000Z`, messageCount: 6 + i * 2, voiceTurns: 2 + i, minutes: 12 + i * 5 }));
}

export function avatarSessionsRepo(studentId: string) {
  let r = sessionRepos.get(studentId);
  if (!r) {
    r = createMockRepository<AvatarSession>({ collection: `avatarSessions:${studentId}`, seed: () => seedSessionsFor(studentId), timestamps: false, defaultSort: { sortBy: "lastAt", sortOrder: "desc" }, latency: 80 });
    sessionRepos.set(studentId, r);
  }
  return r;
}

export function avatarMessagesRepo(studentId: string) {
  let r = messageRepos.get(studentId);
  if (!r) {
    r = createMockRepository<AvatarMessage>({ collection: `avatarMessages:${studentId}`, seed: () => [], timestamps: false, latency: 60 });
    messageRepos.set(studentId, r);
  }
  return r;
}


export const avatarService = {
  list: () => avatarsRepo.all(),

  /** Avatar for a book; created on first access if an older book has none yet. */
  async forBook(bookId: string): Promise<BookAvatar> {
    const found = (await avatarsRepo.raw()).find((a) => a.bookId === bookId);
    if (found) return found;
    const book = await booksRepo.get(bookId);
    // API mode: the server creates the avatar on the first session; until then show the default.
    if (isRemote()) return defaultAvatarFor(book);
    return avatarsRepo.create(defaultAvatarFor(book));
  },

  /** Called by the admin book upload. Idempotent. */
  async ensureForBook(book: Pick<Book, "id" | "title" | "language" | "subjectId">) {
    const found = (await avatarsRepo.raw()).find((a) => a.bookId === book.id);
    return found ?? avatarsRepo.create(defaultAvatarFor(book));
  },

  async save(avatar: BookAvatar) {
    await mockRequest(250);
    if (!avatar.name.bn.trim() || !avatar.name.en.trim()) throw new Error("AVATAR_NAME_REQUIRED");
    if (!avatar.greeting.bn.trim()) throw new Error("AVATAR_GREETING_REQUIRED");
    return avatarsRepo.update(avatar.id, { ...avatar, updatedAt: nowIso() });
  },

  /** Books students can talk to: published book + active avatar. */
  async availableForStudents() {
    const [all, list] = await Promise.all([avatarsRepo.raw(), booksRepo.raw()]);
    return list
      .filter((b) => b.status === "published")
      .map((book) => ({ book, avatar: all.find((a) => a.bookId === book.id) ?? defaultAvatarFor(book) }))
      .filter((x) => x.avatar.status === "active");
  },

  /** Pure preview (admin/teacher "test chat") — nothing is stored. */
  async preview(avatar: BookAvatar, query: string) {
    if (isRemote()) return remote.post<ReturnType<typeof answerFromBook>>("/avatar/preview", { avatar, query });
    await mockRequest(500);
    const book = await booksRepo.get(avatar.bookId);
    return answerFromBook({ book, avatar, query });
  },

  sessions: (studentId: string) => avatarSessionsRepo(studentId).all(),
  async messages(studentId: string, sessionId: string) {
    return (await avatarMessagesRepo(studentId).raw()).filter((m) => m.sessionId === sessionId).sort((a, b) => a.at.localeCompare(b.at));
  },

  async startSession(studentId: string, bookId: string): Promise<{ session: AvatarSession; greeting: AvatarMessage }> {
    if (isRemote()) return remote.post(`/avatar/${studentId}/sessions`, { bookId });
    const avatar = await avatarService.forBook(bookId);
    const session = await avatarSessionsRepo(studentId).create({ id: newId("as"), bookId, avatarId: avatar.id, studentId, title: "নতুন সেশন", startedAt: nowIso(), lastAt: nowIso(), messageCount: 0, voiceTurns: 0, minutes: 0 });
    const lang = avatar.voice.language;
    const text = lang === "en" ? avatar.greeting.en : avatar.greeting.bn;
    const greeting = await avatarMessagesRepo(studentId).create({ id: newId("am"), sessionId: session.id, role: "avatar", text, spoken: text, at: nowIso(), citations: [], grounded: "greeting", followUps: [], simulated: true });
    await avatarsRepo.update(avatar.id, { stats: { ...avatar.stats, sessions: avatar.stats.sessions + 1 } }).catch(() => undefined);
    return { session, greeting };
  },

  /** Student question → book-grounded avatar answer. Requires network (the real AI is server-side). */
  async ask(studentId: string, sessionId: string, text: string, inputMode: "text" | "voice") {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("EMPTY_QUESTION");
    // API mode: the server answers from the book and stores both messages and the counters.
    if (isRemote()) return remote.post<{ question: AvatarMessage; reply: AvatarMessage }>(`/avatar/${studentId}/sessions/${sessionId}/messages`, { text: trimmed, inputMode });
    const sessions = avatarSessionsRepo(studentId);
    const session = await sessions.get(sessionId);
    const [avatar, book] = await Promise.all([avatarService.forBook(session.bookId), booksRepo.get(session.bookId)]);
    const msgs = avatarMessagesRepo(studentId);
    const question = await msgs.create({ id: newId("am"), sessionId, role: "student", text: trimmed, inputMode, at: nowIso(), citations: [], followUps: [], simulated: true });
    await mockRequest(700 + Math.min(900, trimmed.length * 8), { requiresNetwork: true });
    const a = answerFromBook({ book, avatar, query: trimmed });
    const reply = await msgs.create({ id: newId("am"), sessionId, role: "avatar", text: a.text, spoken: a.spoken, at: nowIso(), citations: a.citations, grounded: a.grounded, followUps: a.followUps, simulated: true });
    const first = session.messageCount === 0;
    await sessions.update(sessionId, { lastAt: nowIso(), messageCount: session.messageCount + 2, voiceTurns: session.voiceTurns + (inputMode === "voice" ? 1 : 0), minutes: Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)), title: first ? trimmed.slice(0, 48) : session.title });
    await avatarsRepo.update(avatar.id, { stats: { ...avatar.stats, questions: avatar.stats.questions + 1, outOfScope: avatar.stats.outOfScope + (a.grounded === "out_of_scope" ? 1 : 0) } }).catch(() => undefined);
    return { question, reply };
  },

  async feedback(studentId: string, messageId: string, value: "up" | "down") {
    if (isRemote()) return remote.post<AvatarMessage>(`/avatar/${studentId}/messages/${messageId}/feedback`, { value });
    const m = await avatarMessagesRepo(studentId).update(messageId, { feedback: value });
    const session = await avatarSessionsRepo(studentId).get(m.sessionId);
    const avatar = await avatarsRepo.get(session.avatarId).catch(() => undefined);
    if (avatar) await avatarsRepo.update(avatar.id, { stats: { ...avatar.stats, helpful: avatar.stats.helpful + (value === "up" ? 1 : 0), notHelpful: avatar.stats.notHelpful + (value === "down" ? 1 : 0) } });
    return m;
  },

  async report(studentId: string, messageId: string, reason: string) {
    if (reason.trim().length < 3) throw new Error("REASON_REQUIRED");
    if (isRemote()) return remote.post<AvatarReport>(`/avatar/${studentId}/messages/${messageId}/report`, { reason: reason.trim() });
    const msgs = avatarMessagesRepo(studentId);
    const m = await msgs.update(messageId, { flagged: true });
    const all = await msgs.raw();
    const idx = all.findIndex((x) => x.id === messageId);
    const question = all.slice(0, Math.max(0, idx)).reverse().find((x) => x.sessionId === m.sessionId && x.role === "student");
    const session = await avatarSessionsRepo(studentId).get(m.sessionId);
    return avatarReportsRepo.create({ id: newId("ar"), bookId: session.bookId, avatarId: session.avatarId, studentId, question: question?.text ?? "", answer: m.text, reason: reason.trim(), status: "open", createdAt: nowIso(), updatedAt: nowIso() });
  },

  reports: () => avatarReportsRepo.all(),
  resolveReport: (id: string, status: AvatarReport["status"], resolution: string, by: string) => avatarReportsRepo.update(id, { status, resolution, resolvedBy: by, updatedAt: nowIso() }),


  /** Guardian view: counts only, never message content (privacy). */
  async usageSummary(studentId: string) {
    if (isRemote()) return remote.get<{ bookId: string; sessions: number; questions: number; minutes: number; lastAt: string }[]>(`/avatar/${studentId}/usage`);
    const sessions = await avatarSessionsRepo(studentId).raw();
    const byBook = new Map<string, { bookId: string; sessions: number; questions: number; minutes: number; lastAt: string }>();
    for (const s of sessions) {
      const cur = byBook.get(s.bookId) ?? { bookId: s.bookId, sessions: 0, questions: 0, minutes: 0, lastAt: s.lastAt };
      cur.sessions += 1;
      cur.questions += Math.floor(s.messageCount / 2);
      cur.minutes += s.minutes;
      if (s.lastAt > cur.lastAt) cur.lastAt = s.lastAt;
      byBook.set(s.bookId, cur);
    }
    return [...byBook.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  },
};
