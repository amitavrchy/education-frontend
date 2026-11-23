import type { AnswerWarning, ChatMessage, Citation, Grounding, Question, SourcePassage, TeachingMode, TutorContext } from "@/contracts";
import { scenarios, type Scenario } from "@/mock-data/tutor-scenarios";
import { hashString } from "@/mock-data/utils";

/**
 * Local mock "AI" — deterministic, offline, and honest about being simulated.
 * Pipeline: safety → retrieval (keyword RAG over synthetic passages) → grounding/confidence →
 * mode-specific composition → follow-ups. No network, no model.
 */

export interface EngineInput {
  query: string;
  context: TutorContext;
  passages: SourcePassage[];
  /** Questions available for "related questions" and practice mode. */
  questions: Question[];
  history: Pick<ChatMessage, "role" | "content" | "mode" | "pendingCheck">[];
  archivedVersionIds: string[];
  /** Regenerate → pick a different variant. */
  variant?: number;
}

export type EngineOutput = Pick<ChatMessage, "content" | "citations" | "grounding" | "confidence" | "followUps" | "relatedQuestionIds" | "warnings" | "pendingCheck">;

const UNSAFE = ["আত্মহত্যা", "suicide", "kill myself", "নিজেকে শেষ", "bomb", "বোমা", "weapon", "অস্ত্র বানানো", "drug", "মাদক", "porn", "hack account", "হ্যাক"];
const INTEGRITY = ["homework", "assignment", "হোমওয়ার্ক", "অ্যাসাইনমেন্ট", "বাড়ির কাজ", "লিখে দাও", "do my", "write my", "পুরো উত্তর দিয়ে দাও", "exam answer now", "পরীক্ষা চলছে"];
const EASIER = ["সহজ", "easier", "simpler", "simple", "বুঝিনি", "didn't understand", "don't understand"];
const DEEPER = ["বিস্তারিত", "deeper", "detail", "কঠিন", "harder", "advanced", "কেন"];
const CODE = ["code", "program", "প্রোগ্রাম", "লুপ", "loop", "c language", "সি ভাষা", "function", "ফাংশন", "array", "অ্যারে"];

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFC");
const has = (q: string, words: string[]) => words.some((w) => norm(q).includes(norm(w)));

type Lang = "bn" | "en";
const T = (lang: Lang, bn: string, en: string) => (lang === "en" ? en : bn);

export function retrieve(query: string, context: TutorContext, passages: SourcePassage[]) {
  const q = norm(query);
  const tokens = q.split(/[\s,.?!।;:()"'“”]+/).filter((t) => t.length > 1);
  return passages
    .map((p) => {
      let score = 0;
      for (const k of p.keywords) if (k && q.includes(norm(k))) score += 3;
      const text = norm(p.text);
      for (const t of tokens) if (t.length > 2 && text.includes(t)) score += 1;
      if (score > 0) {
        if (context.topicId && p.topicId === context.topicId) score += 5;
        if (context.chapterId && p.chapterId === context.chapterId) score += 4;
        if (context.subjectId && p.subjectId === context.subjectId) score += 2;
        if (p.curriculumVersionId !== context.curriculumVersionId) score -= 2;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function matchScenario(query: string, context: TutorContext, previous?: string): Scenario | undefined {
  const q = norm(query);
  const ranked = scenarios
    .map((s) => ({ s, score: s.keywords.filter((k) => q.includes(norm(k))).length * 3 + (context.chapterId === s.chapterId ? 2 : 0) + (context.subjectId === s.subjectId ? 1 : 0) + (previous === s.id ? 1 : 0) }))
    .filter((x) => x.score >= 3 || (x.score >= 2 && context.chapterId === x.s.chapterId))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.s;
}

function citation(p: SourcePassage, score: number): Citation {
  const highlight = p.text.split(":")[0];
  return { id: `cit-${p.id}`, passageId: p.id, bookTitle: p.bookTitle, chapterTitle: p.chapterTitle, page: p.page, excerpt: p.text, highlight, curriculumVersionId: p.curriculumVersionId, verification: p.verification, score: Math.min(1, score / 14) };
}

function formulaTable(s: Scenario, lang: Lang) {
  if (!s.formula) return "";
  const rows = s.formula.symbols.map((x) => `| $${x.sym}$ | ${lang === "en" ? x.en : x.bn} | ${x.unit ? `$\\text{${x.unit}}$` : "—"} |`).join("\n");
  return `$$${s.formula.tex}$$\n\n${rows ? `| ${T(lang, "প্রতীক", "Symbol")} | ${T(lang, "অর্থ", "Meaning")} | ${T(lang, "একক", "Unit")} |\n|---|---|---|\n${rows}` : ""}`;
}

const pick = <T,>(lang: Lang, v: { bn: T; en: T }) => (lang === "en" ? v.en : v.bn);

function compose(s: Scenario, mode: TeachingMode, lang: Lang, depth: number, variant: number, step: number): { text: string; pendingCheck?: EngineOutput["pendingCheck"] } {
  const title = pick(lang, s.title);
  const lines: string[] = [];
  switch (mode) {
    case "simple":
      lines.push(`### ${title}`, pick(lang, s.definition));
      if (depth < 0) lines.push(`**${T(lang, "এক কথায়", "In one line")}:** ${pick(lang, s.analogy)}`);
      else lines.push(`💡 **${T(lang, "সহজ উদাহরণ", "Everyday analogy")}:** ${pick(lang, s.analogy)}`, `**${T(lang, "উদাহরণ", "Example")}:** ${pick(lang, s.example)}`);
      if (depth > 0) lines.push(pick(lang, s.explanation), `⚠️ **${T(lang, "সাধারণ ভুল ধারণা", "Common misconception")}:** ${pick(lang, s.misconception)}`);
      break;
    case "socratic": {
      const qs = pick(lang, s.socratic);
      if (step < qs.length) {
        lines.push(step === 0 ? T(lang, `চলো ${title} নিজে নিজে বের করি। আমি প্রশ্ন করব, তুমি ভেবে উত্তর দাও। 🙂`, `Let's work out ${title} together. I'll ask, you think and answer. 🙂`) : T(lang, "ভালো চিন্তা! পরের ধাপ:", "Good thinking! Next step:"), `**${T(lang, "প্রশ্ন", "Question")} ${step + 1}/${qs.length}:** ${qs[step]}`);
        return { text: lines.join("\n\n"), pendingCheck: { prompt: qs[step], expected: "" } };
      }
      lines.push(T(lang, "চমৎকার! এবার পুরো ধারণাটি একসাথে:", "Excellent! Now the whole idea together:"), pick(lang, s.definition), pick(lang, s.explanation));
      break;
    }
    case "board": {
      lines.push(`### ${T(lang, "বোর্ড পরীক্ষার উত্তর", "Board-exam answer")}: ${title}`);
      lines.push(`**${T(lang, "ক) জ্ঞানমূলক (১)", "a) Knowledge (1)")}:** ${pick(lang, s.definition)}`);
      lines.push(`**${T(lang, "খ) অনুধাবনমূলক (২)", "b) Comprehension (2)")}:** ${pick(lang, s.explanation)}`);
      lines.push(`**${T(lang, "গ) প্রয়োগমূলক (৩)", "c) Application (3)")}:** ${pick(lang, s.example)}`);
      if (s.formula) lines.push(`$$${s.formula.tex}$$`);
      lines.push(`**${T(lang, "ঘ) উচ্চতর দক্ষতা (৪)", "d) Higher-order (4)")}:** ${pick(lang, s.misconception)} ${T(lang, "তাই সঠিক ধারণা ও শর্তগুলো উল্লেখ করে বিশ্লেষণ করতে হবে।", "So analyse by stating the correct idea and its conditions.")}`);
      lines.push(`> ${T(lang, "টিপ: সংজ্ঞা হুবহু, সূত্রে একক, এবং শেষে সিদ্ধান্ত লিখলে পূর্ণ নম্বর পাওয়া সহজ।", "Tip: exact definition, units with formulas, and a conclusion help you score full marks.")}`);
      break;
    }
    case "revision":
      lines.push(`### ⚡ ${T(lang, "দ্রুত রিভিশন", "Quick revision")}: ${title}`, ...pick(lang, s.keyPoints).map((k) => `- ${k}`));
      if (s.formula) lines.push(`$$${s.formula.tex}$$`);
      lines.push(`- ⚠️ ${pick(lang, s.misconception)}`);
      break;
    case "stepwise": {
      lines.push(`### ${T(lang, "ধাপে ধাপে সমাধান", "Step-by-step")}: ${title}`);
      const steps = s.steps ? pick(lang, s.steps) : [pick(lang, s.definition), pick(lang, s.explanation), pick(lang, s.example)];
      steps.forEach((st, i) => lines.push(`**${T(lang, "ধাপ", "Step")} ${i + 1}.** ${st}`));
      lines.push(`**${T(lang, "উদাহরণ", "Worked example")}:** ${pick(lang, s.example)}`);
      break;
    }
    case "deep":
      lines.push(`### ${T(lang, "গভীর ধারণা", "Deep dive")}: ${title}`, pick(lang, s.definition), pick(lang, s.explanation));
      if (s.formula) lines.push(formulaTable(s, lang));
      lines.push(`#### ${T(lang, "কেন এটি গুরুত্বপূর্ণ?", "Why it matters")}`, pick(lang, s.example), `#### ${T(lang, "ভুল ধারণা", "Misconception")}`, pick(lang, s.misconception), `#### ${T(lang, "মূল বিষয়", "Key points")}`, ...pick(lang, s.keyPoints).map((k) => `- ${k}`));
      break;
    case "practice": {
      const opts = s.practice.options;
      lines.push(`### 📝 ${T(lang, "অনুশীলন প্রশ্ন", "Practice question")}`, pick(lang, s.practice.q), ...opts.map((o, i) => `${["ক", "খ", "গ", "ঘ"][i]}) ${o}`), T(lang, "তোমার উত্তর (ক/খ/গ/ঘ) লেখো।", "Reply with your answer (a/b/c/d)."));
      return { text: lines.join("\n\n"), pendingCheck: { prompt: pick(lang, s.practice.q), expected: String(s.practice.answer), options: opts } };
    }
    case "oral":
      lines.push(`### 🎤 ${T(lang, "মৌখিক পরীক্ষা", "Oral exam")}`, `**${pick(lang, s.oral.q)}**`, T(lang, "মুখে বলার মতো করে ২–৩ বাক্যে উত্তর লেখো (ভয়েস টিউটরেও বলতে পারো)।", "Answer in 2–3 spoken-style sentences (or use the voice tutor)."));
      return { text: lines.join("\n\n"), pendingCheck: { prompt: pick(lang, s.oral.q), expected: s.oral.expect.join("|") } };
    case "formula":
      lines.push(`### ${T(lang, "সূত্রের ব্যাখ্যা", "Formula explained")}: ${title}`, s.formula ? formulaTable(s, lang) : pick(lang, s.definition), `**${T(lang, "কখন ব্যবহার করবে", "When to use it")}:** ${pick(lang, s.explanation)}`, `**${T(lang, "উদাহরণ", "Example")}:** ${pick(lang, s.example)}`);
      break;
    case "english":
      lines.push(`### English coach`, T(lang, "এই বিষয়টি ইংরেজিতে বলার অনুশীলন করি:", "Let's practise explaining this in English:"), `> ${s.definition.en}`, `**Key vocabulary:** ${s.keywords.filter((k) => /^[a-z ]+$/i.test(k)).slice(0, 5).join(", ")}`, T(lang, "এখন নিজের ভাষায় ইংরেজিতে এক-দুই বাক্যে বলো — আমি ব্যাকরণ ঠিক করে দেব।", "Now say it in your own words in one or two English sentences — I'll correct the grammar."));
      break;
  }
  if (variant % 2 === 1 && mode !== "revision") lines.push(`🔁 ${T(lang, "অন্যভাবে বললে", "Put another way")}: ${pick(lang, s.analogy)}`);
  return { text: lines.join("\n\n") };
}

function correctEnglish(text: string): { corrected: string; notes: string[] } {
  let c = text.trim();
  const notes: string[] = [];
  const rules: [RegExp, string, string][] = [
    [/\bi\b/g, "I", "Capitalise the pronoun “I”."],
    [/\bhave (seen|gone|done|eaten|visited|met) (\w+ )?(yesterday|last \w+|ago)/gi, "", "With a finished time (yesterday / last… / ago) use the simple past, not the present perfect."],
    [/\b(he|she|it) (go|do|have|play|study|read|write)\b/gi, "", "Third-person singular takes -s/-es: he goes, she does, it has."],
    [/\bdont\b/gi, "don't", "Use an apostrophe: don't."],
    [/\bdoesnt\b/gi, "doesn't", "Use an apostrophe: doesn't."],
    [/\bmore better\b/gi, "better", "“Better” is already comparative — drop “more”."],
  ];
  for (const [re, rep, note] of rules) {
    if (re.test(c)) {
      notes.push(note);
      re.lastIndex = 0;
      if (rep) c = c.replace(re, rep);
      else if (note.startsWith("With a finished time")) c = c.replace(/\bhave (seen|gone|done|eaten|visited|met)/gi, (_, v: string) => ({ seen: "saw", gone: "went", done: "did", eaten: "ate", visited: "visited", met: "met" })[v.toLowerCase()] ?? v);
      else c = c.replace(re, (m: string) => { const [subj, verb] = m.split(" "); const v = verb.toLowerCase(); return `${subj} ${v === "have" ? "has" : v === "go" ? "goes" : v === "do" ? "does" : v === "study" ? "studies" : `${v}s`}`; });
    }
  }
  if (!/[.!?]$/.test(c)) {
    c += ".";
    notes.push("End the sentence with a full stop.");
  }
  c = c.charAt(0).toUpperCase() + c.slice(1);
  return { corrected: c, notes };
}

const CODE_ANSWER = (lang: Lang) =>
  [
    `### ${T(lang, "লুপ (for loop) — C ভাষায়", "Loops (for loop) — in C")}`,
    T(lang, "নিচের প্রোগ্রামটি ১ থেকে ১০ পর্যন্ত সংখ্যার যোগফল বের করে:", "This program adds the numbers 1 to 10:"),
    "```c\n#include <stdio.h>\n\nint main(void) {\n    int sum = 0;\n    for (int i = 1; i <= 10; i++) {\n        sum += i;   // প্রতি ধাপে i যোগ\n    }\n    printf(\"Sum = %d\\n\", sum);   // Sum = 55\n    return 0;\n}\n```",
    `| ${T(lang, "অংশ", "Part")} | ${T(lang, "কাজ", "Role")} |\n|---|---|\n| \`int i = 1\` | ${T(lang, "শুরুর মান", "initialisation")} |\n| \`i <= 10\` | ${T(lang, "শর্ত", "condition")} |\n| \`i++\` | ${T(lang, "হালনাগাদ", "update")} |`,
    T(lang, "**ট্রেস করো:** i=1 → sum=1, i=2 → sum=3, … i=10 → sum=55।", "**Trace it:** i=1 → sum=1, i=2 → sum=3, … i=10 → sum=55."),
  ].join("\n\n");

const FOLLOW_UPS: Record<TeachingMode, [string, string][]> = {
  simple: [["আরও সহজ করে বলো", "Explain even more simply"], ["একটি বাস্তব উদাহরণ দাও", "Give a real-life example"], ["আমাকে একটি প্রশ্ন করো", "Ask me a question"]],
  socratic: [["আমি আটকে গেছি, একটা ইঙ্গিত দাও", "I'm stuck — give me a hint"], ["উত্তরটা বলে দাও", "Just tell me the answer"]],
  board: [["এই উত্তরে কত নম্বর পাব?", "How many marks would this get?"], ["সৃজনশীল প্রশ্নের উদাহরণ দাও", "Show a creative-question example"]],
  revision: [["আরও ৩টি গুরুত্বপূর্ণ পয়েন্ট", "3 more key points"], ["দ্রুত কুইজ নাও", "Give me a quick quiz"]],
  stepwise: [["আরেকটি অঙ্ক দাও", "Give me another problem"], ["এই ধাপটি কেন করলাম?", "Why this step?"]],
  deep: [["বাস্তব জীবনে প্রয়োগ কোথায়?", "Where is this used in real life?"], ["আরও কঠিন প্রশ্ন দাও", "Give me a harder question"]],
  practice: [["আরেকটি প্রশ্ন দাও", "Another question"], ["আরও কঠিন প্রশ্ন", "A harder one"]],
  oral: [["পরের মৌখিক প্রশ্ন", "Next oral question"], ["আদর্শ উত্তরটি শোনাও", "Show the model answer"]],
  formula: [["সূত্রটি কীভাবে এল?", "How is the formula derived?"], ["এই সূত্রে একটি অঙ্ক", "A problem using this formula"]],
  english: [["আরেকটি বাক্য সংশোধন করো", "Correct another sentence"], ["Speaking topic দাও", "Give me a speaking topic"]],
};

export function runEngine(input: EngineInput): EngineOutput {
  const { query, context, passages, questions, history, variant = 0 } = input;
  const lang: Lang = context.language === "en" ? "en" : "bn";
  const mode = context.mode;
  const warnings: AnswerWarning[] = [];
  const followUps = FOLLOW_UPS[mode].map(([bn, en]) => T(lang, bn, en));

  // 1) Safety (TUT-59)
  if (has(query, UNSAFE)) {
    return {
      content: T(lang, "এই বিষয়ে আমি সাহায্য করতে পারব না। তুমি যদি কষ্টে থাকো বা নিরাপদ বোধ না করো, এখনই একজন বিশ্বস্ত বড় মানুষ, শিক্ষক বা অভিভাবকের সাথে কথা বলো। জরুরি প্রয়োজনে জাতীয় জরুরি সেবা ৯৯৯-এ কল করো। 💙\n\nপড়াশোনার যেকোনো প্রশ্নে আমি সবসময় আছি।", "I can't help with that. If you're feeling unsafe or upset, please talk to a trusted adult, teacher or guardian right away. In an emergency in Bangladesh, call 999. 💙\n\nI'm always here for your study questions."),
      citations: [],
      grounding: "unavailable",
      confidence: 1,
      followUps: [T(lang, "পড়াশোনার একটি প্রশ্ন করি", "Let me ask a study question")],
      relatedQuestionIds: [],
      warnings: ["safety"],
    };
  }

  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const prevScenario = lastAssistant ? scenarios.find((s) => lastAssistant.content.includes(s.title.bn) || lastAssistant.content.includes(s.title.en))?.id : undefined;

  // 2) Answer checking for practice / oral / socratic turns.
  if (lastAssistant?.pendingCheck && (lastAssistant.mode === "practice" || lastAssistant.mode === "oral")) {
    const pc = lastAssistant.pendingCheck;
    const s = scenarios.find((x) => x.id === prevScenario);
    if (lastAssistant.mode === "practice") {
      const letter = norm(query).trim().match(/^[কখগঘabcd১২৩৪1-4]/)?.[0];
      const idx = letter ? ["ক", "খ", "গ", "ঘ"].indexOf(letter) !== -1 ? ["ক", "খ", "গ", "ঘ"].indexOf(letter) : "abcd".indexOf(letter) !== -1 ? "abcd".indexOf(letter) : "১২৩৪".indexOf(letter) !== -1 ? "১২৩৪".indexOf(letter) : Number(letter) - 1 : (pc.options ?? []).findIndex((o) => norm(query).includes(norm(o).replace(/\$/g, "")));
      const correct = String(idx) === pc.expected;
      const why = s ? pick(lang, s.practice.why) : "";
      return {
        content: correct ? `✅ ${T(lang, "সঠিক! দারুণ।", "Correct! Well done.")}\n\n${why}` : `❌ ${T(lang, "হয়নি।", "Not quite.")} ${T(lang, "সঠিক উত্তর", "The correct answer is")} **${["ক", "খ", "গ", "ঘ"][Number(pc.expected)]}) ${pc.options?.[Number(pc.expected)] ?? ""}**.\n\n${why}`,
        citations: [],
        grounding: s ? "verified" : "general",
        confidence: 0.95,
        followUps,
        relatedQuestionIds: questions.filter((q) => s && q.chapterId === s.chapterId).slice(0, 3).map((q) => q.id),
        warnings: [],
      };
    }
    const expect = pc.expected.split("|");
    const hits = expect.filter((k) => norm(query).includes(norm(k))).length;
    const score = Math.min(10, Math.round((hits / Math.max(2, expect.length / 2)) * 10));
    return {
      content: `### ${T(lang, "মৌখিক মূল্যায়ন (সিমুলেটেড)", "Oral evaluation (simulated)")}\n\n**${T(lang, "নম্বর", "Score")}: ${score}/10**\n\n${score >= 7 ? T(lang, "চমৎকার — মূল শব্দগুলো এসেছে।", "Great — you covered the key terms.") : T(lang, "আরও কিছু মূল শব্দ যোগ করো:", "Add more key terms:")} ${expect.slice(0, 4).join(", ")}\n\n${s ? `**${T(lang, "আদর্শ উত্তর", "Model answer")}:** ${pick(lang, s.definition)}` : ""}`,
      citations: [],
      grounding: s ? "verified" : "general",
      confidence: 0.8,
      followUps,
      relatedQuestionIds: [],
      warnings: [],
    };
  }

  // 3) English coach mode: grammar correction of the student's own sentence.
  if (mode === "english" && /[a-z]/i.test(query) && !matchScenario(query, context)) {
    const { corrected, notes } = correctEnglish(query);
    return {
      content: `### English coach\n\n**${T(lang, "তোমার বাক্য", "You wrote")}:** ${query}\n\n**${T(lang, "সংশোধিত", "Corrected")}:** ${corrected}\n\n${notes.length ? notes.map((n) => `- ${n}`).join("\n") : T(lang, "- চমৎকার! বাক্যটি ব্যাকরণগতভাবে ঠিক আছে।", "- Great! The sentence is grammatically correct.")}\n\n${T(lang, "আরেকটি বাক্য লেখো বা বলো।", "Write or say another sentence.")}`,
      citations: [],
      grounding: "general",
      confidence: 0.75,
      followUps,
      relatedQuestionIds: [],
      warnings: [],
    };
  }

  // 4) Retrieval + scenario
  const hits = retrieve(query, context, passages);
  const scenario = matchScenario(query, context, mode === "socratic" ? prevScenario : undefined);
  const depth = has(query, EASIER) ? -1 : has(query, DEEPER) ? 1 : 0;
  if (has(query, INTEGRITY)) warnings.push("integrity");
  if (input.archivedVersionIds.includes(context.curriculumVersionId)) warnings.push("old_curriculum");
  const versions = new Set(hits.map((h) => h.p.curriculumVersionId));
  const verifs = new Set(hits.slice(0, 2).map((h) => h.p.verification));
  if (hits.length >= 2 && (versions.size > 1 || (verifs.has("verified") && verifs.has("disputed")))) warnings.push("conflicting_sources");

  let grounding: Grounding;
  let body: string;
  let pendingCheck: EngineOutput["pendingCheck"];
  const top = hits[0];

  if (has(query, CODE) && (context.subjectId?.includes("ict") || !context.subjectId)) {
    body = CODE_ANSWER(lang);
    grounding = top ? "partial" : "general";
  } else if (scenario) {
    const step = mode === "socratic" ? history.filter((m) => m.role === "assistant" && m.mode === "socratic" && m.pendingCheck).length : 0;
    const out = compose(scenario, mode, lang, depth, variant, step);
    body = out.text;
    pendingCheck = out.pendingCheck;
    grounding = top && top.score >= 6 ? (top.p.verification === "verified" ? "verified" : "partial") : "partial";
  } else if (top && top.score >= 4) {
    const p = top.p;
    grounding = "partial";
    body = [
      `### ${p.chapterTitle}`,
      T(lang, `পাঠ্যবইয়ের সংশ্লিষ্ট অংশ অনুযায়ী: ${p.text}`, `According to the matching textbook section: ${p.text}`),
      T(lang, "**কীভাবে পড়বে:** প্রথমে সংজ্ঞাটি মুখস্থ নয়, বুঝে পড়ো; তারপর একটি উদাহরণ নিজে তৈরি করো; শেষে অধ্যায়ের অনুশীলনী থেকে ২–৩টি প্রশ্ন সমাধান করো।", "**How to study it:** understand the definition rather than memorise it, make up one example of your own, then solve 2–3 exercise questions."),
      mode === "practice" ? T(lang, "নিচের সম্পর্কিত প্রশ্নগুলো দিয়ে অনুশীলন শুরু করো।", "Start practising with the related questions below.") : "",
    ].filter(Boolean).join("\n\n");
  } else if (context.subjectId) {
    grounding = "general";
    warnings.push("missing_kb");
    body = T(
      lang,
      "এই প্রশ্নের জন্য যাচাইকৃত পাঠ্যবইয়ের অংশ নলেজ বেসে পাওয়া যায়নি, তাই নিচে একটি **সাধারণ ব্যাখ্যা** দেওয়া হলো — পাঠ্যবইয়ের সাথে মিলিয়ে নিও।\n\n- প্রশ্নটি কোন অধ্যায়ের তা ঠিক করো\n- সংশ্লিষ্ট সংজ্ঞা ও সূত্র লেখো\n- একটি উদাহরণ দিয়ে ব্যাখ্যা করো\n\nআরও নির্দিষ্ট করে (অধ্যায় বা টপিকের নাম দিয়ে) জিজ্ঞাসা করলে উৎসসহ উত্তর দিতে পারব।",
      "I couldn't find a verified textbook passage for this in the knowledge base, so here's a **general explanation** — please check it against your textbook.\n\n- Identify which chapter the question belongs to\n- Write the relevant definition and formula\n- Explain with an example\n\nAsk more specifically (mention the chapter or topic) and I can answer with sources.",
    );
  } else {
    grounding = "unavailable";
    warnings.push("low_confidence");
    body = T(lang, "দুঃখিত, প্রশ্নটি ঠিক বুঝতে পারিনি বা এটি সিলেবাসের সাথে মিলছে না। উপরে বিষয় ও অধ্যায় নির্বাচন করে আবার জিজ্ঞাসা করো, যেমন: “ত্বরণ কী?” বা “মোল কাকে বলে?”", "Sorry, I couldn't understand that or it doesn't match the syllabus. Choose a subject and chapter above and ask again, e.g. “What is acceleration?” or “What is a mole?”");
  }

  let confidence = Math.min(0.97, 0.3 + (top?.score ?? 0) * 0.05 + (scenario ? 0.3 : 0) + (grounding === "verified" ? 0.1 : 0));
  if (warnings.includes("conflicting_sources")) confidence = Math.min(confidence, 0.6);
  if (confidence < 0.55 && !warnings.includes("low_confidence") && grounding !== "unavailable") warnings.push("low_confidence");

  const intro: string[] = [];
  if (warnings.includes("integrity"))
    intro.push(T(lang, "📘 *একাডেমিক সততা: আমি সরাসরি হোমওয়ার্ক লিখে দেব না, তবে ধাপে ধাপে বুঝিয়ে দেব যাতে তুমি নিজেই লিখতে পারো।*", "📘 *Academic integrity: I won't write your homework for you, but I'll guide you step by step so you can do it yourself.*"));
  if (warnings.includes("conflicting_sources"))
    intro.push(T(lang, "⚖️ *দুটি উৎসে ভিন্ন ব্যাখ্যা পাওয়া গেছে — নিচে দুটোই উল্লেখ করা হলো। তোমার পাঠ্যবইয়ের সংস্করণ অনুসরণ করো।*", "⚖️ *Two sources explain this differently — both are cited below. Follow your textbook edition.*"));

  const citations = (scenario || (top && top.score >= 4) ? hits : []).slice(0, warnings.includes("conflicting_sources") ? 3 : 2).map((h) => citation(h.p, h.score));
  const chapterId = scenario?.chapterId ?? top?.p.chapterId ?? context.chapterId;
  const related = questions.filter((q) => q.status === "published" && (scenario?.topicId ? q.topicId === scenario.topicId : q.chapterId === chapterId)).slice(0, 3).map((q) => q.id);
  const quickPractice = mode !== "practice" && mode !== "oral" && mode !== "socratic" && scenario ? `\n\n**${T(lang, "দ্রুত অনুশীলন", "Quick practice")}:** ${pick(lang, scenario.practice.q)}` : "";

  return {
    content: [...intro, body].join("\n\n") + quickPractice,
    citations,
    grounding,
    confidence: Math.round(confidence * 100) / 100,
    followUps,
    relatedQuestionIds: related,
    warnings,
    pendingCheck,
  };
}

/** Title for a new conversation from its first question. */
export function titleFrom(query: string): string {
  const clean = query.replace(/[#*$\\`>\n]+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 46)}…` : clean || "নতুন কথোপকথন";
}

/** Chunks for simulated streaming (TUT-61). */
export function streamChunks(text: string): string[] {
  const parts = text.split(/(\s+)/);
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i += 3) chunks.push(parts.slice(i, i + 3).join(""));
  return chunks;
}

export const engineSeed = (s: string) => hashString(s) % 2;
