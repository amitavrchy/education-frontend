import type { AvatarCitation, Book, BookAvatar } from "@/contracts";
import { bookPage } from "@/mock-data/books";
import { topics } from "@/mock-data/curriculum";
import { scenarios, type Scenario } from "@/mock-data/tutor-scenarios";

/**
 * Mock "book-grounded" answer engine for the per-book avatar teacher.
 * It only looks inside the selected book (its pages + tutor scenarios for chapters that the book
 * contains). Anything else is answered with an out-of-scope reply. A real backend replaces this with
 * RAG restricted to the book's document id (see docs/api/AI_TUTOR_CONTRACT.md).
 */

export interface AvatarAnswer {
  text: string;
  spoken: string;
  citations: AvatarCitation[];
  grounded: "book" | "greeting" | "out_of_scope";
  followUps: string[];
}

type Lang = "bn" | "en";

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFC");
const STOP = new Set(["কী", "কি", "কাকে", "বলে", "কেন", "কীভাবে", "কিভাবে", "এর", "এবং", "ও", "একটি", "আমাকে", "বলো", "বুঝিয়ে", "দাও", "করো", "what", "is", "the", "a", "an", "of", "and", "how", "why", "explain", "me", "please", "define", "tell", "about", "in", "to"]);

export function tokens(s: string): string[] {
  return norm(s)
    .replace(/[?!।,.;:()"'“”‘’\-–—/\\]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export const isBangla = (s: string) => /[ঀ-৿]/.test(s);

/** Readable speech text: strip Markdown/LaTeX. */
export function toSpoken(md: string, lang: Lang): string {
  return md
    .replace(/\$\$([^$]+)\$\$/g, (_, tex: string) => ` ${lang === "bn" ? "সূত্র" : "formula"}: ${texToWords(tex)}. `)
    .replace(/\$([^$]+)\$/g, (_, tex: string) => texToWords(tex))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [label](url) → label
    .replace(/[*_#>`]/g, "")
    .replace(/\[(\d+)\]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function texToWords(tex: string) {
  return tex
    .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, "$1")
    .replace(/\\t?frac\{([^}]*)\}\{([^}]*)\}/g, "$1 / $2")
    .replace(/\^\{?2\}?/g, " squared")
    .replace(/\\(?:qquad|quad|,|;)/g, " ")
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const GREETING = /^(হ্যালো|হাই|নমস্কার|আসসালামু|সালাম|শুভ|hello|hi|hey|good (morning|afternoon|evening))/i;
const WHO = /(তুমি কে|আপনি কে|তোমার নাম|আপনার নাম|who are you|your name|introduce)/i;
const CHAPTERS_Q = /(অধ্যায়গুলো|কী কী অধ্যায়|সূচি|সূচিপত্র|chapters|table of contents|what.*(in|does).*book)/i;

interface Candidate {
  page: number;
  score: number;
  heading?: string;
  chapterTitle: string;
  chapterId?: string;
  excerpt: string;
}

function scopeChapters(book: Book, avatar: BookAvatar) {
  return avatar.scopeChapterIds.length ? book.chapters.filter((c) => c.chapterId && avatar.scopeChapterIds.includes(c.chapterId)) : book.chapters;
}

function searchPages(book: Book, avatar: BookAvatar, q: string[], lang: Lang): Candidate[] {
  const out: Candidate[] = [];
  for (const ref of scopeChapters(book, avatar)) {
    const chapterTitle = lang === "en" ? ref.title.en : ref.title.bn;
    for (let p = ref.startPage; p <= ref.endPage; p++) {
      const page = bookPage(book, p);
      const heading = norm(page.heading ?? "");
      const body = norm(page.body);
      const ch = norm(`${ref.title.bn} ${ref.title.en}`);
      const topic = topics.find((t) => t.chapterId === ref.chapterId && (t.title.bn === page.heading || t.title.en === page.heading));
      const topicText = topic ? norm(`${topic.title.bn} ${topic.title.en}`) : "";
      let score = 0;
      for (const t of q) {
        if (heading.includes(t)) score += 4;
        if (topicText.includes(t)) score += 3;
        if (ch.includes(t)) score += 2;
        if (body.includes(t)) score += 1;
      }
      if (score > 0) {
        const para = page.body.split("\n\n").find((x) => x.startsWith("**")) ?? page.body.split("\n\n")[1] ?? "";
        out.push({ page: p, score, heading: page.heading, chapterTitle, chapterId: ref.chapterId, excerpt: para.replace(/\*\(.*?\)\*/g, "").slice(0, 220) });
      }
    }
  }
  return out.sort((a, b) => b.score - a.score || a.page - b.page);
}

function matchScenario(book: Book, avatar: BookAvatar, query: string): Scenario | undefined {
  const ids = new Set(scopeChapters(book, avatar).map((c) => c.chapterId));
  const q = norm(query);
  const scored = scenarios
    .filter((s) => ids.has(s.chapterId))
    .map((s) => ({ s, score: s.keywords.filter((k) => k && q.includes(norm(k))).length }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].s : undefined;
}

function followUpsFor(book: Book, avatar: BookAvatar, chapterId: string | undefined, lang: Lang, exclude?: string): string[] {
  const chs = scopeChapters(book, avatar);
  const chapterIds = chapterId ? [chapterId, ...chs.map((c) => c.chapterId).filter((x) => x !== chapterId)] : chs.map((c) => c.chapterId);
  const list: string[] = [];
  for (const cid of chapterIds) {
    for (const t of topics.filter((x) => x.chapterId === cid)) {
      const name = lang === "en" ? t.title.en : t.title.bn;
      if (name === exclude) continue;
      list.push(lang === "en" ? `What is ${name}?` : `${name} কী?`);
      if (list.length >= 3) return list;
    }
  }
  return list;
}

export function answerFromBook(input: { book: Book; avatar: BookAvatar; query: string }): AvatarAnswer {
  const { book, avatar, query } = input;
  // Reply in the language the student used; fall back to the avatar's language.
  const lang: Lang = isBangla(query) ? "bn" : /[a-z]/i.test(query) ? "en" : avatar.voice.language;
  const L = (bn: string, en: string) => (lang === "en" ? en : bn);
  const bookTitle = lang === "en" ? book.title.en : book.title.bn;
  const name = lang === "en" ? avatar.name.en : avatar.name.bn;
  const trimmed = query.trim();

  // Small talk & meta questions
  if (GREETING.test(trimmed) && trimmed.length < 40) {
    const text = lang === "en" ? avatar.greeting.en : avatar.greeting.bn;
    return { text, spoken: toSpoken(text, lang), citations: [], grounded: "greeting", followUps: followUpsFor(book, avatar, undefined, lang) };
  }
  if (WHO.test(trimmed)) {
    const text = L(`আমি ${name}, "${bookTitle}" বইয়ের শিক্ষক। এই বইয়ের যেকোনো অধ্যায় থেকে প্রশ্ন করো — আমি বইয়ের পৃষ্ঠা দেখিয়ে উত্তর দেব।`, `I'm ${name}, the teacher for "${bookTitle}". Ask me anything from this book — I'll answer with the page it comes from.`);
    return { text, spoken: toSpoken(text, lang), citations: [], grounded: "greeting", followUps: followUpsFor(book, avatar, undefined, lang) };
  }
  if (CHAPTERS_Q.test(trimmed)) {
    const chs = scopeChapters(book, avatar);
    const text = L(`এই বইয়ে ${chs.length}টি অধ্যায় আছে:\n\n`, `This book has ${chs.length} chapters:\n\n`) + chs.map((c, i) => `${i + 1}. ${lang === "en" ? c.title.en : c.title.bn} — ${L("পৃষ্ঠা", "p.")} ${c.startPage}`).join("\n");
    return { text, spoken: toSpoken(text.split("\n").slice(0, 6).join(". "), lang), citations: [], grounded: "book", followUps: followUpsFor(book, avatar, undefined, lang) };
  }

  const q = tokens(trimmed);
  const scenario = matchScenario(book, avatar, trimmed);
  const pages = searchPages(book, avatar, q, lang);
  const best = pages[0];

  if (scenario) {
    const ref = book.chapters.find((c) => c.chapterId === scenario.chapterId)!;
    const sTitle = lang === "en" ? scenario.title.en : scenario.title.bn;
    const page = pages.find((p) => p.chapterId === scenario.chapterId)?.page ?? ref.startPage;
    const parts: string[] = [];
    const style = avatar.persona.style;
    if (style === "socratic") parts.push(L(`চলো একসাথে ভাবি। প্রথমে বইয়ের সংজ্ঞাটা দেখো:`, `Let's think it through. First, the book's definition:`));
    parts.push(`**${sTitle}:** ${lang === "en" ? scenario.definition.en : scenario.definition.bn}`);
    if (avatar.persona.answerLength !== "short") parts.push(lang === "en" ? scenario.explanation.en : scenario.explanation.bn);
    if (scenario.formula) parts.push(`$$${scenario.formula.tex}$$`);
    if (avatar.persona.useExamples && avatar.persona.answerLength !== "short") parts.push(`${L("উদাহরণ", "Example")}: ${lang === "en" ? scenario.example.en : scenario.example.bn}`);
    if (avatar.persona.answerLength === "detailed") parts.push(`${L("মনে রাখো", "Remember")}: ${(lang === "en" ? scenario.keyPoints.en : scenario.keyPoints.bn).join(" · ")}`);
    if (style === "socratic") parts.push(lang === "en" ? scenario.socratic.en[0] : scenario.socratic.bn[0]);
    parts.push(L(`📖 সূত্র: "${bookTitle}", ${lang === "en" ? ref.title.en : ref.title.bn}, পৃষ্ঠা ${page}`, `📖 Source: "${bookTitle}", ${ref.title.en}, page ${page}`));
    const text = parts.join("\n\n");
    return {
      text,
      spoken: toSpoken(parts.slice(0, -1).join(" "), lang),
      citations: [{ page, chapterTitle: lang === "en" ? ref.title.en : ref.title.bn, heading: sTitle, excerpt: (lang === "en" ? scenario.definition.en : scenario.definition.bn).slice(0, 220) }],
      grounded: "book",
      followUps: followUpsFor(book, avatar, scenario.chapterId, lang, sTitle),
    };
  }

  if (best && best.score >= 3) {
    const extra = pages.slice(1, avatar.persona.answerLength === "detailed" ? 3 : 2).filter((p) => p.page !== best.page);
    const heading = best.heading ?? best.chapterTitle;
    const parts = [
      L(`বইয়ের "${best.chapterTitle}" অধ্যায়ে **${heading}** নিয়ে বলা আছে:`, `The chapter "${best.chapterTitle}" covers **${heading}**:`),
      best.excerpt.replace(/^\*\*[^*]+\*\*\s*/, ""),
      avatar.persona.answerLength !== "short"
        ? L(`বইটি পরামর্শ দেয় — আগে সংজ্ঞা নিজের ভাষায় বলো, তারপর উদাহরণে প্রয়োগ করো। পরীক্ষায় ${heading} থেকে সংজ্ঞা ও প্রয়োগমূলক প্রশ্ন আসে।`, `The book suggests stating the definition in your own words first, then applying it to an example. Exams often ask definitions and application questions on ${heading}.`)
        : "",
      ...extra.map((p) => L(`আরও দেখো: ${p.heading ?? p.chapterTitle} (পৃষ্ঠা ${p.page})`, `See also: ${p.heading ?? p.chapterTitle} (page ${p.page})`)),
      L(`📖 সূত্র: "${bookTitle}", পৃষ্ঠা ${best.page}`, `📖 Source: "${bookTitle}", page ${best.page}`),
    ].filter(Boolean);
    const text = parts.join("\n\n");
    return {
      text,
      spoken: toSpoken(parts.slice(0, 3).join(" "), lang),
      citations: [best, ...extra].map((p) => ({ page: p.page, chapterTitle: p.chapterTitle, heading: p.heading, excerpt: p.excerpt })),
      grounded: "book",
      followUps: followUpsFor(book, avatar, best.chapterId, lang, best.heading),
    };
  }

  // Out of scope
  const suggestions = followUpsFor(book, avatar, undefined, lang);
  const text = avatar.strictBookScope
    ? L(`দুঃখিত, এই প্রশ্নের উত্তর "${bookTitle}" বইয়ে খুঁজে পাইনি। আমি শুধু এই বইয়ের বিষয়বস্তু থেকে উত্তর দিই। বইয়ের কোনো অধ্যায় বা টপিক নিয়ে প্রশ্ন করো — যেমন:`, `Sorry, I couldn't find that in "${bookTitle}". I only answer from this book. Try asking about one of its chapters or topics, for example:`) + "\n\n" + suggestions.map((s) => `• ${s}`).join("\n")
    : L(`এই বইয়ে সরাসরি উত্তর পাইনি। সাধারণ ব্যাখ্যার জন্য AI টিউটর ব্যবহার করো।`, `I couldn't find this in the book. Use the AI tutor for a general explanation.`);
  return { text, spoken: toSpoken(text.split("\n\n")[0], lang), citations: [], grounded: "out_of_scope", followUps: suggestions };
}
