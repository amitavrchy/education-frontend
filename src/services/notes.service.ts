import type { Note, NoteFolder, NoteKind } from "@/contracts";
import { chapters, subjects, topics } from "@/mock-data/curriculum";
import { scenarios } from "@/mock-data/tutor-scenarios";
import { daysFromNow } from "@/mock-data/utils";
import { createMockRepository, matchesSearch } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { progressService } from "./progress.service";
import { registerSearchProvider, scoreText } from "./search.service";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Keeps $…$ maths readable in notes (rendered as text; the note editor is rich text, not Markdown). */
const plain = (s: string) => esc(s.replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)").replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\,/g, " ").replace(/[\\$]/g, ""));

export const NOTE_KIND_LABELS: Record<NoteKind, [string, string]> = {
  short: ["সংক্ষিপ্ত নোট", "Short notes"],
  detailed: ["বিস্তারিত নোট", "Detailed notes"],
  revision: ["রিভিশন নোট", "Revision notes"],
  formula: ["সূত্র শিট", "Formula sheet"],
  definition: ["সংজ্ঞা শিট", "Definition sheet"],
  takeaways: ["মূল শিক্ষা", "Key takeaways"],
  important_questions: ["গুরুত্বপূর্ণ প্রশ্ন", "Important questions"],
  custom: ["নিজের নোট", "Custom note"],
};

/** Simulated "AI" note generation from curriculum + scenario knowledge (NOTE-02…13). */
export function generateNoteHtml(kind: NoteKind, opts: { chapterId?: string; topicId?: string; questionText?: string; answerText?: string; conversation?: string; uploadName?: string }): { title: string; html: string } {
  const chapter = chapters.find((c) => c.id === opts.chapterId);
  const topic = topics.find((t) => t.id === opts.topicId);
  const chapterTopics = topics.filter((t) => t.chapterId === (opts.chapterId ?? topic?.chapterId));
  const sc = scenarios.find((s) => (topic && s.topicId === topic.id) || s.chapterId === (opts.chapterId ?? topic?.chapterId));
  const subjectName = subjects.find((s) => s.id === (chapter?.subjectId ?? topic?.subjectId))?.name.bn ?? "";
  const heading = topic?.title.bn ?? chapter?.title.bn ?? "নোট";
  const sim = `<p><em>এই নোটটি স্থানীয় সিমুলেশন দিয়ে তৈরি (কৃত্রিম ডেমো) — পাঠ্যবইয়ের সাথে মিলিয়ে নাও।</em></p>`;

  if (opts.questionText) {
    return { title: `প্রশ্ন নোট: ${plain(opts.questionText).slice(0, 40)}`, html: `<h2>প্রশ্ন</h2><p>${plain(opts.questionText)}</p><h2>উত্তর</h2><p>${plain(opts.answerText ?? "")}</p><h3>মনে রাখার বিষয়</h3><ul><li>সংজ্ঞা সঠিকভাবে লেখো</li><li>সূত্রে একক উল্লেখ করো</li><li>শেষে সিদ্ধান্ত লেখো</li></ul>${sim}` };
  }
  if (opts.conversation) {
    const lines = opts.conversation.split("\n").filter((l) => l.trim() && !l.startsWith("```")).slice(0, 14);
    return { title: "AI কথোপকথন থেকে নোট", html: `<h2>কথোপকথনের সারাংশ</h2><ul>${lines.map((l) => `<li>${plain(l.replace(/^[#>*-]+\s*/, ""))}</li>`).join("")}</ul>${sim}` };
  }
  if (opts.uploadName) {
    return { title: `আপলোড থেকে নোট: ${esc(opts.uploadName)}`, html: `<h2>${esc(opts.uploadName)} — সারাংশ (সিমুলেটেড)</h2><p>ফাইলটি থেকে লেখা শনাক্ত করা হয়েছে বলে ধরা হচ্ছে। মূল পয়েন্টগুলো:</p><ul><li>মূল ধারণা ১ — নিজের ভাষায় লেখো</li><li>মূল ধারণা ২ — একটি উদাহরণ যোগ করো</li><li>গুরুত্বপূর্ণ সূত্র/সংজ্ঞা চিহ্নিত করো</li></ul>${sim}` };
  }

  const tlist = chapterTopics.map((t) => t.title.bn);
  const kp = sc?.keyPoints.bn ?? tlist.map((t) => `${t}-এর সংজ্ঞা ও প্রয়োগ`);
  let html = "";
  switch (kind) {
    case "short":
      html = `<h2>${heading}</h2><ul>${kp.slice(0, 4).map((k) => `<li>${plain(k)}</li>`).join("")}</ul>`;
      break;
    case "detailed":
      html = `<h2>${heading}</h2><p>${plain(sc?.definition.bn ?? chapter?.description.bn ?? "")}</p><p>${plain(sc?.explanation.bn ?? "")}</p>${tlist.map((t) => `<h3>${t}</h3><p>${t} — সংজ্ঞা, বৈশিষ্ট্য, উদাহরণ ও প্রয়োগ লেখো। অধ্যায়ের অনুশীলনী থেকে ২টি প্রশ্ন সমাধান করো।</p>`).join("")}${sc ? `<blockquote><p>ভুল ধারণা: ${plain(sc.misconception.bn)}</p></blockquote>` : ""}`;
      break;
    case "revision":
      html = `<h2>রিভিশন: ${heading}</h2><ol>${kp.map((k) => `<li>${plain(k)}</li>`).join("")}</ol><p><strong>শেষ মুহূর্তের টিপ:</strong> প্রতিটি টপিকের একটি করে উদাহরণ মনে রাখো।</p>`;
      break;
    case "formula":
      html = `<h2>সূত্র শিট: ${heading}</h2>${sc?.formula ? `<p><code>${plain(sc.formula.tex)}</code></p><table><tbody><tr><th>প্রতীক</th><th>অর্থ</th><th>একক</th></tr>${sc.formula.symbols.map((s) => `<tr><td>${plain(s.sym)}</td><td>${s.bn}</td><td>${plain(s.unit ?? "—")}</td></tr>`).join("")}</tbody></table>` : `<p>এই অধ্যায়ের জন্য নির্দিষ্ট সূত্র নেই। মূল সংজ্ঞাগুলো দেখো।</p>`}`;
      break;
    case "definition":
      html = `<h2>সংজ্ঞা শিট: ${heading}</h2><ul>${(sc ? [`<strong>${sc.title.bn}:</strong> ${plain(sc.definition.bn)}`] : []).concat(tlist.map((t) => `<strong>${t}:</strong> (পাঠ্যবই থেকে সংজ্ঞাটি লেখো)`)).map((x) => `<li>${x}</li>`).join("")}</ul>`;
      break;
    case "takeaways":
      html = `<h2>মূল শিক্ষা: ${heading}</h2><ul>${kp.slice(0, 5).map((k) => `<li>✅ ${plain(k)}</li>`).join("")}</ul>`;
      break;
    case "important_questions":
      html = `<h2>গুরুত্বপূর্ণ প্রশ্ন: ${heading}</h2><ol>${tlist.map((t) => `<li>${t} কী? উদাহরণসহ ব্যাখ্যা করো।</li>`).join("")}${sc ? `<li>${plain(sc.practice.q.bn)}</li>` : ""}</ol>`;
      break;
    default:
      html = `<h2>${heading}</h2><p></p>`;
  }
  return { title: `${NOTE_KIND_LABELS[kind][0]}: ${heading}${subjectName ? ` (${subjectName})` : ""}`, html: html + sim };
}

function seedNotes(studentId: string): { notes: Note[]; folders: NoteFolder[] } {
  if (studentId !== "u-student-1") return { notes: [], folders: [] };
  const folders: NoteFolder[] = [
    { id: "nf-1", name: "পদার্থবিজ্ঞান", color: "#2563eb", createdAt: daysFromNow(-30) },
    { id: "nf-2", name: "রসায়ন", color: "#9333ea", createdAt: daysFromNow(-30) },
    { id: "nf-3", name: "পরীক্ষার আগে", color: "#dc2626", createdAt: daysFromNow(-10) },
  ];
  const make = (id: string, kind: NoteKind, chapterId: string, folderId: string, daysAgo: number, extra: Partial<Note> = {}): Note => {
    const g = generateNoteHtml(kind, { chapterId });
    const ch = chapters.find((c) => c.id === chapterId)!;
    return { id, title: g.title, content: g.html, kind, folderId, tags: [ch.title.bn], favorite: false, linkedNoteIds: [], source: { type: "chapter", refId: chapterId, label: ch.title.bn }, subjectId: ch.subjectId, chapterId, offline: false, versions: [], createdAt: daysFromNow(-daysAgo), updatedAt: daysFromNow(-daysAgo + 1), ...extra };
  };
  const notes = [
    make("note-1", "revision", "ssc-physics-c2", "nf-1", 5, { favorite: true, linkedNoteIds: ["note-2"], tags: ["গতি", "পরীক্ষা"], versions: [{ at: daysFromNow(-5), title: "রিভিশন: গতি (খসড়া)", content: "<p>প্রথম খসড়া</p>" }] }),
    make("note-2", "formula", "ssc-physics-c3", "nf-1", 4, { tags: ["বল", "সূত্র"] }),
    make("note-3", "detailed", "ssc-chemistry-c6", "nf-2", 3, { favorite: true, offline: true }),
    make("note-4", "important_questions", "ssc-biology-c4", "nf-3", 2),
    make("note-5", "definition", "ssc-math-c5", "nf-3", 1),
  ];
  return { notes, folders };
}

const repos = new Map<string, { notes: ReturnType<typeof createMockRepository<Note>>; folders: ReturnType<typeof createMockRepository<NoteFolder>> }>();
export function notesRepos(studentId: string) {
  let x = repos.get(studentId);
  if (!x) {
    let seeded: ReturnType<typeof seedNotes> | null = null;
    const seed = () => (seeded ??= seedNotes(studentId));
    x = {
      notes: createMockRepository<Note>({ collection: `notes:${studentId}`, seed: () => seed().notes, searchFields: ["title", "content", "tags"], defaultSort: { sortBy: "updatedAt", sortOrder: "desc" }, latency: 100 }),
      folders: createMockRepository<NoteFolder>({ collection: `noteFolders:${studentId}`, seed: () => seed().folders, timestamps: false }),
    };
    repos.set(studentId, x);
  }
  return x;
}

export interface NoteDraftInput {
  kind: NoteKind;
  title?: string;
  content?: string;
  source: Note["source"];
  subjectId?: string;
  chapterId?: string;
  folderId?: string;
  tags?: string[];
}

export const notesService = {
  list: (studentId: string) => notesRepos(studentId).notes.all(),
  get: (studentId: string, id: string) => notesRepos(studentId).notes.get(id),
  folders: (studentId: string) => notesRepos(studentId).folders.all(),

  async create(studentId: string, input: NoteDraftInput) {
    await mockRequest(input.content ? 100 : 700);
    const gen = input.content ? { title: input.title ?? "নতুন নোট", html: input.content } : generateNoteHtml(input.kind, { chapterId: input.chapterId, topicId: input.source.type === "topic" ? input.source.refId : undefined, uploadName: input.source.type === "upload" ? input.source.label : undefined });
    const note = await notesRepos(studentId).notes.create({
      id: newId("note"),
      title: input.title ?? gen.title,
      content: gen.html,
      kind: input.kind,
      folderId: input.folderId,
      tags: input.tags ?? [],
      favorite: false,
      linkedNoteIds: [],
      source: input.source,
      subjectId: input.subjectId,
      chapterId: input.chapterId,
      offline: false,
      versions: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await progressService.logActivity(studentId, { kind: "notes", minutes: 3, label: "নোট তৈরি", xp: 10 });
    return note;
  },

  /** Autosave keeps a version snapshot at most every 5 minutes (NOTE-23/24). */
  async save(studentId: string, id: string, patch: Partial<Pick<Note, "title" | "content" | "tags" | "folderId" | "favorite" | "linkedNoteIds" | "offline" | "kind">>) {
    const repo = notesRepos(studentId).notes;
    const current = await repo.get(id);
    const last = current.versions[0];
    const contentChanged = patch.content !== undefined && patch.content !== current.content;
    const snapshot = contentChanged && (!last || Date.now() - new Date(last.at).getTime() > 5 * 60_000);
    return repo.update(id, { ...patch, versions: snapshot ? [{ at: current.updatedAt, title: current.title, content: current.content }, ...current.versions].slice(0, 20) : current.versions });
  },
  async restoreVersion(studentId: string, id: string, at: string) {
    const repo = notesRepos(studentId).notes;
    const n = await repo.get(id);
    const v = n.versions.find((x) => x.at === at);
    if (!v) return n;
    return repo.update(id, { title: v.title, content: v.content, versions: [{ at: n.updatedAt, title: n.title, content: n.content }, ...n.versions].slice(0, 20) });
  },
  remove: (studentId: string, id: string) => notesRepos(studentId).notes.remove(id),
  createFolder: (studentId: string, name: string, color: string) => notesRepos(studentId).folders.create({ id: newId("nf"), name, color, createdAt: nowIso() }),
  async removeFolder(studentId: string, id: string) {
    const repo = notesRepos(studentId).notes;
    await repo.bulkUpdate((await repo.raw()).filter((n) => n.folderId === id).map((n) => n.id), { folderId: undefined });
    await notesRepos(studentId).folders.remove(id);
  },
  fromConversation: (studentId: string, title: string, transcript: string, subjectId?: string, chapterId?: string) => {
    const g = generateNoteHtml("custom", { conversation: transcript });
    return notesService.create(studentId, { kind: "takeaways", title: title || g.title, content: g.html, source: { type: "conversation", label: title }, subjectId, chapterId });
  },
  fromQuestion: (studentId: string, q: { id: string; stem: string; answer: string; subjectId: string; chapterId: string }) => {
    const g = generateNoteHtml("important_questions", { questionText: q.stem, answerText: q.answer });
    return notesService.create(studentId, { kind: "important_questions", title: g.title, content: g.html, source: { type: "question", refId: q.id }, subjectId: q.subjectId, chapterId: q.chapterId });
  },
};

registerSearchProvider("note", async (q) => {
  const id = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("shikkhaai-auth") ?? "{}")?.state?.user?.id : undefined;
  if (!id) return [];
  return (await notesRepos(id).notes.raw())
    .filter((n) => matchesSearch(n, q, ["title", "content", "tags"]))
    .map((n) => ({ kind: "note" as const, id: n.id, title: { bn: n.title, en: n.title }, subtitle: { bn: NOTE_KIND_LABELS[n.kind][0], en: NOTE_KIND_LABELS[n.kind][1] }, href: `/student/notes/${n.id}`, score: scoreText(n.title, q), subjectId: n.subjectId }));
});
