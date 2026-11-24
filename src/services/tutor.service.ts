import type { ChatMessage, Conversation, ConversationFolder, TutorContext } from "@/contracts";
import { ARCHIVED_VERSION_ID, CURRENT_VERSION_ID } from "@/mock-data/curriculum";
import { daysFromNow } from "@/mock-data/utils";
import { runEngine, titleFrom } from "./ai/tutor-engine";
import { createMockRepository } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { passagesRepo } from "./kb.service";
import { progressService } from "./progress.service";
import { questionsRepo, reportsRepo } from "./question.service";
import { registerSearchProvider, scoreText } from "./search.service";
import { usageService } from "./usage.service";

export const defaultContext = (patch: Partial<TutorContext> = {}): TutorContext => ({
  levelCode: "SSC",
  grade: 10,
  curriculumVersionId: CURRENT_VERSION_ID,
  language: "bn",
  mode: "simple",
  // Undefined values (e.g. a profile that is still loading) must not erase the defaults —
  // an undefined curriculum version makes retrieval reject every passage.
  ...(Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<TutorContext>),
});

function seedConversations(studentId: string): { conversations: Conversation[]; messages: ChatMessage[]; folders: ConversationFolder[] } {
  if (studentId !== "u-student-1") return { conversations: [], messages: [], folders: [] };
  const folders: ConversationFolder[] = [
    { id: "fld-1", name: "পরীক্ষার প্রস্তুতি", color: "#0f766e", createdAt: daysFromNow(-20) },
    { id: "fld-2", name: "কঠিন টপিক", color: "#be123c", createdAt: daysFromNow(-15) },
  ];
  const mk = (id: string, title: string, ctx: Partial<TutorContext>, at: number, extra: Partial<Conversation> = {}): Conversation => ({
    id,
    title,
    context: defaultContext(ctx),
    pinned: false,
    archived: false,
    messageCount: 2,
    lastMessagePreview: "",
    share: { enabled: false, includeName: false },
    createdAt: daysFromNow(-at),
    updatedAt: daysFromNow(-at, 20),
    ...extra,
  });
  const conversations = [
    mk("cv-1", "ত্বরণ কী? সহজভাবে", { subjectId: "ssc-physics", chapterId: "ssc-physics-c2", mode: "simple" }, 1, { pinned: true, folderId: "fld-1" }),
    mk("cv-2", "মোল সংখ্যা হিসাব", { subjectId: "ssc-chemistry", chapterId: "ssc-chemistry-c6", mode: "stepwise" }, 3, { folderId: "fld-2" }),
    mk("cv-3", "সালোকসংশ্লেষণ বোর্ড উত্তর", { subjectId: "ssc-biology", chapterId: "ssc-biology-c4", mode: "board" }, 6),
    mk("cv-4", "পিথাগোরাস উপপাদ্য", { subjectId: "ssc-math", chapterId: "ssc-math-c7", mode: "socratic" }, 12, { archived: true }),
  ];
  const q = (cid: string, text: string, at: number): ChatMessage => ({ id: newId("msg"), conversationId: cid, role: "user", content: text, createdAt: daysFromNow(-at, 19), status: "complete", citations: [], followUps: [], relatedQuestionIds: [], warnings: [], simulated: true });
  const messages: ChatMessage[] = [];
  for (const [c, text] of [
    [conversations[0], "ত্বরণ কী? সহজভাবে বুঝিয়ে দাও"],
    [conversations[1], "88 g CO2 তে কত মোল?"],
    [conversations[2], "সালোকসংশ্লেষণ নিয়ে বোর্ড পরীক্ষার মতো উত্তর লেখো"],
    [conversations[3], "পিথাগোরাসের উপপাদ্য বুঝতে চাই"],
  ] as const) {
    const at = (Date.now() - new Date(c.updatedAt).getTime()) / 86400000;
    const user = q(c.id, text, Math.round(at));
    messages.push(user);
    c.lastMessagePreview = text;
  }
  return { conversations, messages, folders };
}

const repos = new Map<string, { conversations: ReturnType<typeof createMockRepository<Conversation>>; messages: ReturnType<typeof createMockRepository<ChatMessage>>; folders: ReturnType<typeof createMockRepository<ConversationFolder>> }>();

function r(studentId: string) {
  let x = repos.get(studentId);
  if (!x) {
    let seeded: ReturnType<typeof seedConversations> | null = null;
    const seed = () => (seeded ??= seedConversations(studentId));
    x = {
      conversations: createMockRepository<Conversation>({ collection: `conversations:${studentId}`, seed: () => seed().conversations, searchFields: ["title", "lastMessagePreview"], defaultSort: { sortBy: "updatedAt", sortOrder: "desc" }, latency: 100 }),
      messages: createMockRepository<ChatMessage>({ collection: `messages:${studentId}`, seed: () => seed().messages, searchFields: ["content"], timestamps: false, latency: 60, defaultSort: { sortBy: "createdAt", sortOrder: "asc" } }),
      folders: createMockRepository<ConversationFolder>({ collection: `folders:${studentId}`, seed: () => seed().folders, timestamps: false }),
    };
    repos.set(studentId, x);
  }
  return x;
}

/** Backfills assistant replies for seeded conversations on first open (keeps seeds small). */
async function ensureReplies(studentId: string, conversationId: string) {
  const all = await r(studentId).messages.raw();
  const msgs = all.filter((m) => m.conversationId === conversationId);
  if (msgs.length !== 1 || msgs[0].role !== "user") return;
  const convo = await r(studentId).conversations.get(conversationId);
  const reply = await generate(studentId, convo.context, msgs[0].content, [], 0);
  const assistant: ChatMessage = { ...reply, id: newId("msg"), conversationId, role: "assistant", createdAt: new Date(new Date(msgs[0].createdAt).getTime() + 8000).toISOString(), status: "complete", mode: convo.context.mode, simulated: true };
  if (conversationId === "cv-1")
    assistant.corrections = [{ at: daysFromNow(-1, 21), by: "ড. মাহমুদ হাসান (রিভিউয়ার)", note: "উদাহরণে এককের বানান সংশোধন করা হয়েছে (m s⁻²)।" }];
  await r(studentId).messages.replaceAll([...all, assistant]);
}

async function generate(studentId: string, context: TutorContext, query: string, history: ChatMessage[], variant: number) {
  const [passages, questions] = await Promise.all([passagesRepo.raw(), questionsRepo.raw()]);
  return runEngine({ query, context, passages, questions, history, archivedVersionIds: [ARCHIVED_VERSION_ID], variant });
}

export const tutorService = {
  conversations: (studentId: string) => r(studentId).conversations.all(),
  folders: (studentId: string) => r(studentId).folders.all(),
  async messages(studentId: string, conversationId: string) {
    await ensureReplies(studentId, conversationId);
    return (await r(studentId).messages.all()).filter((m) => m.conversationId === conversationId);
  },

  async create(studentId: string, context: TutorContext, title = "নতুন কথোপকথন") {
    return r(studentId).conversations.create({ id: newId("cv"), title, context, pinned: false, archived: false, messageCount: 0, lastMessagePreview: "", share: { enabled: false, includeName: false }, createdAt: nowIso(), updatedAt: nowIso() });
  },
  update: (studentId: string, id: string, patch: Partial<Conversation>) => r(studentId).conversations.update(id, patch),
  async remove(studentId: string, id: string) {
    const m = r(studentId).messages;
    await m.replaceAll((await m.raw()).filter((x) => x.conversationId !== id));
    await r(studentId).conversations.remove(id);
  },

  /**
   * Sends a student message and produces the simulated tutor reply.
   * Requires connectivity (AI is online-only) and respects the plan's daily AI quota.
   */
  async send(studentId: string, conversationId: string, content: string, opts: { replaceFromMessageId?: string } = {}) {
    await mockRequest(150, { requiresNetwork: true });
    await usageService.consume(studentId, "ai");
    const repo = r(studentId);
    const convo = await repo.conversations.get(conversationId);
    let all = await repo.messages.raw();
    if (opts.replaceFromMessageId) {
      // Edit message: drop it and everything after, then resend.
      const msgs = all.filter((m) => m.conversationId === conversationId);
      const idx = msgs.findIndex((m) => m.id === opts.replaceFromMessageId);
      const drop = new Set(msgs.slice(idx).map((m) => m.id));
      all = all.filter((m) => !drop.has(m.id));
    }
    const history = all.filter((m) => m.conversationId === conversationId);
    const user: ChatMessage = { id: newId("msg"), conversationId, role: "user", content, createdAt: nowIso(), editedAt: opts.replaceFromMessageId ? nowIso() : undefined, status: "complete", citations: [], followUps: [], relatedQuestionIds: [], warnings: [], simulated: true };
    await mockRequest(700, { requiresNetwork: true });
    const reply = await generate(studentId, convo.context, content, history, 0);
    const assistant: ChatMessage = { ...reply, id: newId("msg"), conversationId, role: "assistant", createdAt: nowIso(), status: "complete", mode: convo.context.mode, simulated: true };
    await repo.messages.replaceAll([...all, user, assistant]);
    await repo.conversations.update(conversationId, {
      title: history.length === 0 && convo.title === "নতুন কথোপকথন" ? titleFrom(content) : convo.title,
      messageCount: history.length + 2,
      lastMessagePreview: content.slice(0, 120),
    });
    await progressService.logActivity(studentId, { kind: "tutor", minutes: 2, label: "AI টিউটর সেশন", xp: 5 });
    return { user, assistant };
  },

  async regenerate(studentId: string, conversationId: string, assistantId: string) {
    await mockRequest(800, { requiresNetwork: true });
    await usageService.consume(studentId, "ai");
    const repo = r(studentId);
    const convo = await repo.conversations.get(conversationId);
    const all = await repo.messages.raw();
    const msgs = all.filter((m) => m.conversationId === conversationId);
    const idx = msgs.findIndex((m) => m.id === assistantId);
    const prompt = [...msgs.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!prompt) return;
    const reply = await generate(studentId, convo.context, prompt.content, msgs.slice(0, idx - 1), 1 + Math.floor(Math.random() * 3));
    return repo.messages.update(assistantId, { ...reply, createdAt: nowIso(), feedback: undefined });
  },

  updateMessage: (studentId: string, id: string, patch: Partial<ChatMessage>) => r(studentId).messages.update(id, patch),

  async report(studentId: string, message: ChatMessage, reason: string) {
    await reportsRepo.create({ id: newId("rep"), kind: "ai_answer", refId: message.id, reason, details: message.content.slice(0, 200), reporterId: studentId, status: "open", createdAt: nowIso() });
    return r(studentId).messages.update(message.id, { reported: true });
  },

  async requestTeacherReview(studentId: string, message: ChatMessage) {
    await mockRequest(300);
    return r(studentId).messages.update(message.id, { teacherReviewRequested: true });
  },

  createFolder: (studentId: string, name: string, color: string) => r(studentId).folders.create({ id: newId("fld"), name, color, createdAt: nowIso() }),
  async removeFolder(studentId: string, id: string) {
    const c = r(studentId).conversations;
    const inFolder = (await c.raw()).filter((x) => x.folderId === id).map((x) => x.id);
    await c.bulkUpdate(inFolder, { folderId: undefined });
    await r(studentId).folders.remove(id);
  },

  async enableShare(studentId: string, id: string, includeName: boolean) {
    return r(studentId).conversations.update(id, { share: { enabled: true, includeName, linkId: newId("share") } });
  },
  disableShare: (studentId: string, id: string) => r(studentId).conversations.update(id, { share: { enabled: false, includeName: false } }),

  async searchMessages(studentId: string, q: string) {
    const needle = q.toLowerCase();
    return (await r(studentId).messages.raw()).filter((m) => m.content.toLowerCase().includes(needle));
  },
};

registerSearchProvider("conversation", async (q) => {
  // Searches the signed-in demo student's conversations only (provider has no session access otherwise).
  const id = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("shikkhaai-auth") ?? "{}")?.state?.user?.id : undefined;
  if (!id) return [];
  const list = await r(id).conversations.raw();
  return list
    .filter((c) => `${c.title} ${c.lastMessagePreview}`.toLowerCase().includes(q.toLowerCase()))
    .map((c) => ({ kind: "conversation" as const, id: c.id, title: { bn: c.title, en: c.title }, subtitle: { bn: "AI টিউটর কথোপকথন", en: "AI tutor conversation" }, href: `/student/ai-tutor?c=${c.id}`, score: scoreText(c.title, q) - 5, subjectId: c.context.subjectId }));
});
