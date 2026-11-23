import type { VoiceLanguage, VoiceSession, VoiceTurn } from "@/contracts";
import { scenarios, type Scenario } from "@/mock-data/tutor-scenarios";
import { daysFromNow } from "@/mock-data/utils";
import { createMockRepository } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { flashcardService } from "./flashcards.service";
import { notesService } from "./notes.service";
import { progressService } from "./progress.service";
import { usageService } from "./usage.service";

/**
 * Voice AI tutor (§9). The UI talks to a `VoiceAdapter`. Today it is a deterministic mock that
 * composes short spoken replies from the synthetic tutor scenarios; a realtime streaming voice API
 * can implement the same interface later. Speech-to-text / text-to-speech use the browser's
 * native APIs when available and are labelled as device features — never as production ASR.
 */

export interface VoiceReplyInput {
  text: string;
  language: VoiceLanguage;
  mode: VoiceSession["mode"];
  /** Oral exam: the scenario whose question is being answered. */
  oralScenarioId?: string;
  subjectId?: string;
}
export interface VoiceReply {
  text: string;
  /** Oral exam: next scenario asked + score of the previous answer. */
  oralScenarioId?: string;
  score?: { got: number; max: number };
  latencyMs: number;
}
export interface VoiceAdapter {
  reply(input: VoiceReplyInput): Promise<VoiceReply>;
  opening(language: VoiceLanguage, mode: VoiceSession["mode"], subjectId?: string): VoiceReply;
}

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFC");
const T = (lang: VoiceLanguage, bn: string, en: string) => (lang === "en" ? en : lang === "mixed" ? `${bn} (${en})` : bn);

function matchScenario(text: string, subjectId?: string): Scenario | undefined {
  const q = norm(text);
  const scored = scenarios
    .map((s) => ({ s, score: s.keywords.filter((k) => q.includes(norm(k))).length * 2 + (subjectId && s.subjectId === subjectId ? 1 : 0) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 2 ? scored[0].s : undefined;
}

function oralPick(subjectId: string | undefined, exclude?: string) {
  const pool = scenarios.filter((s) => (!subjectId || s.subjectId === subjectId) && s.id !== exclude);
  return (pool.length ? pool : scenarios)[Math.floor(Date.now() / 1000) % (pool.length || scenarios.length)];
}

export const mockVoiceAdapter: VoiceAdapter = {
  opening(language, mode, subjectId) {
    if (mode === "oral_exam") {
      const s = oralPick(subjectId);
      return { text: T(language, `মৌখিক পরীক্ষা শুরু করছি। প্রথম প্রশ্ন: ${s.oral.q.bn}`, `Let's start the oral exam. First question: ${s.oral.q.en}`), oralScenarioId: s.id, latencyMs: 0 };
    }
    return { text: T(language, "আসসালামু আলাইকুম! আমি তোমার ভয়েস টিউটর। কোন বিষয়টা বুঝতে চাও?", "Hello! I'm your voice tutor. What would you like to understand today?"), latencyMs: 0 };
  },
  async reply(input) {
    const latencyMs = 700 + (input.text.length % 7) * 120;
    await mockRequest(latencyMs, { requiresNetwork: true });
    const lang = input.language;
    if (input.mode === "oral_exam") {
      const asked = scenarios.find((s) => s.id === input.oralScenarioId);
      const next = oralPick(input.subjectId, asked?.id);
      if (!asked) return { text: T(lang, `প্রশ্ন: ${next.oral.q.bn}`, `Question: ${next.oral.q.en}`), oralScenarioId: next.id, latencyMs };
      const hits = asked.oral.expect.filter((k) => norm(input.text).includes(norm(k))).length;
      const max = Math.max(1, Math.min(3, asked.oral.expect.length));
      const got = Math.min(max, hits);
      const feedback =
        got >= max
          ? T(lang, "চমৎকার! উত্তরে সব মূল ধারণা আছে।", "Excellent! Your answer covers all the key ideas.")
          : got > 0
            ? T(lang, `ভালো চেষ্টা। আরও যোগ করতে পারতে: ${asked.oral.expect.slice(got, got + 2).join(", ")}।`, `Good try. You could also mention: ${asked.oral.expect.slice(got, got + 2).join(", ")}.`)
            : T(lang, `মূল ধারণাটি হলো: ${asked.definition.bn}`, `The key idea is: ${asked.definition.en}`);
      return { text: `${feedback} ${T(lang, `পরের প্রশ্ন: ${next.oral.q.bn}`, `Next question: ${next.oral.q.en}`)}`, oralScenarioId: next.id, score: { got, max }, latencyMs };
    }
    const s = matchScenario(input.text, input.subjectId);
    if (!s) {
      return {
        text: T(lang, "প্রশ্নটা আরেকটু নির্দিষ্ট করে বলবে? যেমন বলো: 'ত্বরণ কী' বা 'মোল ধারণা বোঝাও'। এই ডেমোতে কিছু নির্দিষ্ট টপিকের উত্তর আছে।", "Could you be more specific? For example: 'what is acceleration' or 'explain the mole concept'. This demo covers a set of topics."),
        latencyMs,
      };
    }
    const wantsExample = /উদাহরণ|example/i.test(input.text);
    const body = wantsExample ? T(lang, s.example.bn, s.example.en) : `${T(lang, s.definition.bn, s.definition.en)} ${T(lang, s.analogy.bn, s.analogy.en)}`;
    const ask = T(lang, `বুঝেছ কিনা দেখি: ${s.socratic.bn[0] ?? s.oral.q.bn}`, `Let me check: ${s.socratic.en[0] ?? s.oral.q.en}`);
    return { text: `${body} ${ask}`.replace(/\$[^$]*\$/g, "").replace(/\*\*/g, ""), latencyMs };
  },
};

/** Deterministic demo utterances (used when device speech recognition is unavailable or for demos). */
export const DEMO_SCRIPTS: Record<VoiceLanguage, string[]> = {
  bn: ["ত্বরণ কী একটু সহজ করে বলো", "একটা উদাহরণ দাও", "মোল ধারণা বোঝাও", "সালোকসংশ্লেষণ কী"],
  en: ["What is acceleration?", "Give me an example", "Explain the mole concept", "What is photosynthesis?"],
  mixed: ["ত্বরণ মানে কি acceleration?", "একটা example দাও", "mole concept টা বোঝাও", "photosynthesis কী জিনিস"],
};

function seedSessions(studentId: string): VoiceSession[] {
  if (studentId !== "u-student-1") return [];
  const t = (speaker: VoiceTurn["speaker"], text: string, origin: VoiceTurn["origin"], d: number): VoiceTurn => ({ id: newId("vt"), speaker, text, at: daysFromNow(-d, 19), origin });
  return [
    { id: "vs-1", title: "ত্বরণ নিয়ে আলোচনা", mode: "tutor", language: "bn", voiceId: "bn-female-1", subjectId: "ssc-physics", startedAt: daysFromNow(-2, 19), endedAt: daysFromNow(-2, 19, 12), durationSec: 720, saved: true, summary: "ত্বরণের সংজ্ঞা, একক ও রিকশার উদাহরণ নিয়ে আলোচনা।", turns: [t("ai", "আসসালামু আলাইকুম! কোন বিষয়টা বুঝতে চাও?", "mock_ai", 2), t("student", "ত্বরণ কী একটু সহজ করে বলো", "demo_script", 2), t("ai", "সময়ের সাথে বেগ পরিবর্তনের হারকে ত্বরণ বলে।", "mock_ai", 2)] },
    { id: "vs-2", title: "মৌখিক পরীক্ষা: রসায়ন", mode: "oral_exam", language: "bn", voiceId: "bn-male-1", subjectId: "ssc-chemistry", startedAt: daysFromNow(-6, 20), endedAt: daysFromNow(-6, 20, 9), durationSec: 540, saved: true, summary: "৩টি প্রশ্নে ৫/৯ স্কোর। মোলার ভর আরও অনুশীলন প্রয়োজন।", turns: [t("ai", "মৌখিক পরীক্ষা শুরু করছি। প্রথম প্রশ্ন: মোল কী?", "mock_ai", 6), t("student", "অ্যাভোগাড্রো সংখ্যক কণা", "typed", 6)] },
  ];
}

const repos = new Map<string, ReturnType<typeof createMockRepository<VoiceSession>>>();
export function voiceRepo(studentId: string) {
  let r = repos.get(studentId);
  if (!r) {
    r = createMockRepository<VoiceSession>({ collection: `voice:${studentId}`, seed: () => seedSessions(studentId), timestamps: false, defaultSort: { sortBy: "startedAt", sortOrder: "desc" }, latency: 100 });
    repos.set(studentId, r);
  }
  return r;
}

const transcript = (s: VoiceSession) => s.turns.map((t) => `${t.speaker === "student" ? "শিক্ষার্থী" : "টিউটর"}: ${t.text}`).join("\n");

export const voiceService = {
  adapter: mockVoiceAdapter as VoiceAdapter,
  sessions: (studentId: string) => voiceRepo(studentId).all(),
  async quota(studentId: string) {
    const { meter, limits } = await usageService.get(studentId);
    return { minutesUsed: meter.voiceMinutesThisMonth, minutesLimit: limits.voiceMinutesPerMonth, periodLabel: new Date().toISOString().slice(0, 7) };
  },
  /** Persists a finished session and charges voice minutes. */
  async save(studentId: string, session: VoiceSession) {
    const minutes = Math.max(1, Math.ceil(session.durationSec / 60));
    await usageService.consume(studentId, "voice", minutes).catch(() => undefined);
    const summary = session.summary ?? voiceService.summarize(session);
    const saved = { ...session, saved: true, summary };
    const repo = voiceRepo(studentId);
    if (await repo.find(session.id)) await repo.update(session.id, saved);
    else await repo.create(saved);
    await progressService.logActivity(studentId, { kind: "voice", minutes, label: session.mode === "oral_exam" ? "মৌখিক পরীক্ষা অনুশীলন" : "ভয়েস টিউটর সেশন" });
    return saved;
  },
  remove: (studentId: string, id: string) => voiceRepo(studentId).remove(id),
  summarize(session: VoiceSession) {
    const asked = session.turns.filter((t) => t.speaker === "student").map((t) => t.text);
    const mins = Math.max(1, Math.round(session.durationSec / 60));
    return `${mins} মিনিটের সেশন। আলোচিত প্রশ্ন: ${asked.slice(0, 4).join("; ") || "—"}।`;
  },
  async toNotes(studentId: string, session: VoiceSession) {
    return notesService.fromConversation(studentId, `ভয়েস সেশন: ${session.title}`, transcript(session), session.subjectId);
  },
  async toFlashcards(studentId: string, session: VoiceSession) {
    return flashcardService.generateFromText(studentId, `ভয়েস: ${session.title}`, "conversation", session.turns.filter((t) => t.speaker === "ai").map((t) => t.text).join("\n"), session.subjectId);
  },
  newSession(partial: Pick<VoiceSession, "mode" | "language" | "voiceId" | "subjectId">): VoiceSession {
    return { id: newId("vs"), title: partial.mode === "oral_exam" ? "মৌখিক পরীক্ষা" : "ভয়েস সেশন", ...partial, startedAt: nowIso(), durationSec: 0, turns: [], saved: false };
  },
};
