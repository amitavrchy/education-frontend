import { getDocument, saveDocument } from "@/lib/mock-db";
import { dateKey } from "@/mock-data/utils";
import { mockRequest } from "./core/mock-runtime";
import { isRemote, remote } from "./core/remote";
import { flashcardService, flashcardRepos } from "./flashcards.service";
import { progressService } from "./progress.service";

/**
 * English learning coach (§22). All exercises are original demo content. Writing feedback and
 * pronunciation scoring are deterministic heuristics — clearly labelled as simulated.
 */

export type EnglishSkill = "grammar" | "vocabulary" | "writing" | "reading" | "listening" | "speaking";

export interface McqItem {
  id: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
  topic: string;
}

export const GRAMMAR_QUIZ: McqItem[] = [
  { id: "g1", topic: "Tense", q: "She ___ to school every day.", options: ["go", "goes", "is go", "going"], answer: 1, why: "Present simple + third person singular takes -s/-es: she goes." },
  { id: "g2", topic: "Tense", q: "They ___ football when it started to rain.", options: ["play", "were playing", "have played", "plays"], answer: 1, why: "An action in progress in the past, interrupted by another → past continuous." },
  { id: "g3", topic: "Article", q: "He is ___ honest man.", options: ["a", "an", "the", "no article"], answer: 1, why: "'Honest' begins with a vowel sound (silent h), so we use 'an'." },
  { id: "g4", topic: "Preposition", q: "The book is ___ the table.", options: ["in", "on", "at", "into"], answer: 1, why: "'On' is used for a surface." },
  { id: "g5", topic: "Voice", q: "Passive of 'Rahim wrote a letter':", options: ["A letter is written by Rahim.", "A letter was written by Rahim.", "A letter has been written by Rahim.", "Rahim was written a letter."], answer: 1, why: "Past simple active → was/were + past participle in the passive." },
  { id: "g6", topic: "Narration", q: "He said, \"I am busy.\" → He said that he ___ busy.", options: ["is", "was", "were", "has been"], answer: 1, why: "In reported speech, present 'am' shifts back to 'was'." },
  { id: "g7", topic: "Subject-verb agreement", q: "Each of the students ___ a book.", options: ["have", "has", "are having", "were having"], answer: 1, why: "'Each' is singular, so the verb is singular: has." },
  { id: "g8", topic: "Right form of verbs", q: "If I ___ a bird, I would fly.", options: ["am", "was", "were", "be"], answer: 2, why: "Unreal conditional uses 'were' for all persons." },
];

export const CORRECTIONS: { id: string; wrong: string; right: string; why: string }[] = [
  { id: "c1", wrong: "He don't like tea.", right: "He doesn't like tea.", why: "Third person singular negative uses 'doesn't'." },
  { id: "c2", wrong: "I am agree with you.", right: "I agree with you.", why: "'Agree' is a verb; it doesn't need 'am'." },
  { id: "c3", wrong: "She is more taller than me.", right: "She is taller than me.", why: "Don't combine 'more' with a comparative ending in -er." },
  { id: "c4", wrong: "I have seen him yesterday.", right: "I saw him yesterday.", why: "A finished past time ('yesterday') needs the past simple, not the present perfect." },
];

export const VOCAB: { word: string; bn: string; example: string }[] = [
  { word: "abundant", bn: "প্রচুর", example: "Bangladesh has abundant rainfall in the monsoon." },
  { word: "diligent", bn: "পরিশ্রমী", example: "A diligent student revises every day." },
  { word: "inevitable", bn: "অনিবার্য", example: "Change is inevitable." },
  { word: "meticulous", bn: "অতি যত্নশীল", example: "She kept meticulous notes for every chapter." },
  { word: "resilient", bn: "সহনশীল", example: "Farmers are resilient after floods." },
  { word: "scarce", bn: "দুষ্প্রাপ্য", example: "Clean water is scarce in some areas." },
  { word: "eloquent", bn: "বাগ্মী", example: "He gave an eloquent speech on Victory Day." },
  { word: "benevolent", bn: "পরোপকারী", example: "The benevolent man built a school for the village." },
  { word: "obsolete", bn: "অপ্রচলিত", example: "Floppy disks are obsolete now." },
  { word: "prudent", bn: "বিচক্ষণ", example: "It is prudent to save some money." },
];

export const WRITING_TASKS: { id: string; kind: "paragraph" | "essay" | "composition" | "email"; title: string; prompt: string; minWords: number; maxWords: number; hints: string[] }[] = [
  { id: "w1", kind: "paragraph", title: "Paragraph: A Rainy Day", prompt: "Write a paragraph of about 150 words on 'A Rainy Day'.", minWords: 120, maxWords: 180, hints: ["Describe the sky and sounds", "How people and roads are affected", "Your feelings"] },
  { id: "w2", kind: "email", title: "Email to a friend about your exam preparation", prompt: "Write an email to your friend telling him/her about your preparation for the SSC exam.", minWords: 100, maxWords: 160, hints: ["Greeting", "Your study routine", "Subjects you find hard", "Closing"] },
  { id: "w3", kind: "composition", title: "Composition: Digital Bangladesh", prompt: "Write a composition on 'Digital Bangladesh' in about 250 words.", minWords: 200, maxWords: 300, hints: ["Introduction", "Areas of digitisation", "Benefits", "Challenges", "Conclusion"] },
  { id: "w4", kind: "essay", title: "Essay: The importance of reading", prompt: "Write an essay on 'The importance of reading' (about 200 words).", minWords: 160, maxWords: 260, hints: ["Why read", "Knowledge and imagination", "Reading habits", "Conclusion"] },
];

export const READING = {
  title: "The Sundarbans",
  passage:
    "The Sundarbans is the largest mangrove forest in the world. It lies in the south-west of Bangladesh and stretches into India. The forest protects the coast from cyclones and storm surges. It is home to the Royal Bengal Tiger, spotted deer, crocodiles and many kinds of birds. Thousands of people depend on the forest for honey, fish and wood. However, rising sea levels and over-cutting of trees are threatening this natural wonder. We must protect the Sundarbans for future generations.",
  questions: [
    { id: "r1", q: "Where does the Sundarbans lie?", options: ["North-east of Bangladesh", "South-west of Bangladesh", "Central Bangladesh", "Only in India"], answer: 1, why: "The passage says it lies in the south-west of Bangladesh." },
    { id: "r2", q: "How does the forest help the coast?", options: ["It brings rain", "It protects it from cyclones", "It creates rivers", "It stops tourism"], answer: 1, why: "It protects the coast from cyclones and storm surges." },
    { id: "r3", q: "Which is a threat to the Sundarbans?", options: ["Honey collection", "Rising sea levels", "Birds", "Tourists"], answer: 1, why: "Rising sea levels and over-cutting are named as threats." },
  ] as McqItem[],
};

export const LISTENING = {
  title: "A school announcement",
  script: "Good morning, students. Tomorrow our school will hold a science fair in the main hall from ten a.m. to two p.m. Every class must display at least one project. Parents are welcome to visit. Please bring your projects to the hall by nine thirty.",
  questions: [
    { id: "l1", q: "What event will the school hold?", options: ["A sports day", "A science fair", "A book fair", "A prize-giving"], answer: 1, why: "The announcement is about a science fair." },
    { id: "l2", q: "When must projects reach the hall?", options: ["By 9:30", "By 10:00", "By 2:00", "In the afternoon"], answer: 0, why: "Bring projects by nine thirty." },
    { id: "l3", q: "Who is welcome to visit?", options: ["Only teachers", "Parents", "Other schools", "Nobody"], answer: 1, why: "Parents are welcome to visit." },
  ] as McqItem[],
};

export const SPEAKING_PROMPTS = ["Introduce yourself in three sentences.", "Describe your favourite season and why you like it.", "What do you want to be in future? Why?", "Tell us about your best friend."];
export const PRONUNCIATION = ["The weather is beautiful this morning.", "I usually read the newspaper after breakfast.", "Thirty three thousand three hundred.", "She sells sea shells on the sea shore."];

// ---------------------------------------------------------------- Pure heuristics (unit-tested)

export interface WritingFeedback {
  words: number;
  sentences: number;
  scores: { grammar: number; vocabulary: number; structure: number; task: number };
  overall: number;
  issues: { text: string; why: string; fix?: string }[];
  strengths: string[];
}

const COMMON_ERRORS: { re: RegExp; why: string; fix: string }[] = [
  { re: /\bi\b/g, why: "The pronoun 'I' is always a capital letter.", fix: "I" },
  { re: /\bdont\b/gi, why: "Missing apostrophe in the contraction.", fix: "don't" },
  { re: /\bcant\b/gi, why: "Missing apostrophe in the contraction.", fix: "can't" },
  { re: /\b(he|she|it) don't\b/gi, why: "Third person singular uses 'doesn't'.", fix: "doesn't" },
  { re: /\bmore (better|bigger|taller|smaller)\b/gi, why: "Don't combine 'more' with an -er comparative.", fix: "better/bigger…" },
  { re: /\bam agree\b/gi, why: "'Agree' doesn't need 'am'.", fix: "agree" },
  { re: /\s,/g, why: "No space before a comma.", fix: "," },
];
const LINKERS = ["however", "moreover", "therefore", "firstly", "finally", "in conclusion", "because", "although", "for example", "furthermore"];

export function writingFeedback(text: string, task: { minWords: number; maxWords: number; kind: string }): WritingFeedback {
  const clean = text.trim();
  const wordList = clean.split(/\s+/).filter(Boolean);
  const words = wordList.length;
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 2);
  const issues: WritingFeedback["issues"] = [];
  for (const e of COMMON_ERRORS) {
    const m = clean.match(e.re);
    if (m) issues.push({ text: m[0], why: e.why, fix: e.fix });
  }
  for (const s of sentences) if (s.trim()[0] && s.trim()[0] !== s.trim()[0].toUpperCase()) issues.push({ text: s.trim().slice(0, 30), why: "A sentence should start with a capital letter." });
  const long = sentences.filter((s) => s.split(/\s+/).length > 35);
  if (long.length) issues.push({ text: long[0].trim().slice(0, 40) + "…", why: "Very long sentence — split it into two for clarity." });
  const freq = new Map<string, number>();
  for (const w of wordList.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")).filter((w) => w.length > 4)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const repeated = [...freq.entries()].filter(([, n]) => n >= 4).map(([w]) => w);
  if (repeated.length) issues.push({ text: repeated.join(", "), why: "Repeated word(s) — try synonyms for variety." });
  const unique = new Set(wordList.map((w) => w.toLowerCase())).size;
  const linkers = LINKERS.filter((k) => clean.toLowerCase().includes(k));
  const lengthOk = words >= task.minWords && words <= task.maxWords;
  const emailOk = task.kind !== "email" || (/\b(dear|hi|hello)\b/i.test(clean) && /\b(regards|yours|best wishes|love)\b/i.test(clean));
  const grammar = Math.max(30, 100 - issues.filter((i) => !i.why.startsWith("Repeated") && !i.why.startsWith("Very long")).length * 12);
  const vocabulary = Math.round(Math.min(100, 40 + (unique / Math.max(1, words)) * 90));
  const structure = Math.min(100, 45 + linkers.length * 10 + (sentences.length >= 5 ? 15 : 0) + (clean.includes("\n") ? 10 : 0));
  const taskScore = Math.round((lengthOk ? 70 : Math.max(20, 70 - Math.abs(words - task.minWords) / 3)) + (emailOk ? 30 : 0));
  const overall = Math.round((grammar + vocabulary + structure + taskScore) / 4);
  const strengths = [
    ...(linkers.length >= 2 ? [`Good use of linking words (${linkers.slice(0, 3).join(", ")}).`] : []),
    ...(unique / Math.max(1, words) > 0.6 ? ["Varied vocabulary."] : []),
    ...(lengthOk ? ["Meets the word limit."] : []),
  ];
  if (!lengthOk) issues.push({ text: `${words} words`, why: `Aim for ${task.minWords}–${task.maxWords} words.` });
  if (!emailOk) issues.push({ text: "Format", why: "An email needs a greeting (Dear …) and a closing (Regards/Yours …)." });
  return { words, sentences: sentences.length, scores: { grammar, vocabulary, structure, task: Math.min(100, taskScore) }, overall, issues, strengths };
}

/** Simulated pronunciation score: word overlap between target and what was heard/typed. */
export function pronunciationScore(target: string, heard: string) {
  const t = target.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const h = new Set(heard.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean));
  const matched = t.filter((w) => h.has(w));
  const missed = t.filter((w) => !h.has(w));
  return { score: Math.round((matched.length / Math.max(1, t.length)) * 100), matched, missed };
}

// ---------------------------------------------------------------- Progress (per student)

export interface EnglishProgress {
  id: "english";
  skills: Record<EnglishSkill, { attempts: number; score: number; history: { date: string; score: number }[] }>;
  writing: { taskId: string; at: string; overall: number }[];
}

const empty = (): EnglishProgress => ({
  id: "english",
  skills: { grammar: { attempts: 4, score: 72, history: [] }, vocabulary: { attempts: 3, score: 64, history: [] }, writing: { attempts: 1, score: 58, history: [] }, reading: { attempts: 2, score: 80, history: [] }, listening: { attempts: 1, score: 67, history: [] }, speaking: { attempts: 0, score: 0, history: [] } },
  writing: [],
});
const key = (studentId: string) => `english:${studentId}`;

export const englishService = {
  async progress(studentId: string) {
    await mockRequest(100);
    return getDocument<EnglishProgress>(key(studentId), empty);
  },
  /** Writing feedback: the AI service in API mode, the rule-based checker in the mock. */
  async writing(studentId: string, text: string, task: { minWords: number; maxWords: number; kind: string; title?: string }): Promise<WritingFeedback> {
    if (!isRemote()) return writingFeedback(text, task);
    return remote.post<WritingFeedback>(`/english/${studentId}/writing`, { text, kind: task.kind, prompt: task.title ?? "", minWords: task.minWords, maxWords: task.maxWords });
  },
  async record(studentId: string, skill: EnglishSkill, score: number, extra?: { taskId?: string }) {
    const p = await getDocument<EnglishProgress>(key(studentId), empty);
    const s = p.skills[skill];
    const attempts = s.attempts + 1;
    const next: EnglishProgress = {
      ...p,
      skills: { ...p.skills, [skill]: { attempts, score: Math.round((s.score * s.attempts + score) / attempts), history: [...s.history, { date: dateKey(0), score }].slice(-20) } },
      writing: extra?.taskId ? [{ taskId: extra.taskId, at: new Date().toISOString(), overall: score }, ...p.writing].slice(0, 30) : p.writing,
    };
    await saveDocument(key(studentId), next);
    await progressService.logActivity(studentId, { kind: "practice", minutes: 5, label: `English: ${skill}`, xp: Math.round(score / 5) });
    return next;
  },
  /** Adds a word to the student's English vocabulary deck (creating it if needed). */
  async addVocabCard(studentId: string, word: string, meaning: string, example: string) {
    const decks = await flashcardRepos(studentId).decks.raw();
    let deck = decks.find((d) => d.source === "english_vocab");
    if (!deck) deck = await flashcardService.createDeck(studentId, { name: "English vocabulary", source: "english_vocab" });
    const exists = (await flashcardRepos(studentId).cards.raw()).some((c) => c.deckId === deck.id && c.front.toLowerCase() === word.toLowerCase());
    if (exists) return { deck, added: false };
    await flashcardService.addCard(studentId, deck.id, word, `${meaning}\n\n_${example}_`, undefined, ["vocabulary"]);
    return { deck, added: true };
  },
};
