import type { EvaluationPage, HandwritingEvaluation, Question, RubricScore } from "@/contracts";
import { daysFromNow, hashString } from "@/mock-data/utils";
import { toImageDataUrl } from "@/lib/image-data-url";
import { createMockRepository } from "./core/repository";
import { isRemote, remote } from "./core/remote";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notificationService } from "./notification.service";
import { progressService } from "./progress.service";
import { usageService } from "./usage.service";

/**
 * Handwriting & answer-sheet evaluator (§17). OCR and marking are SIMULATED:
 * - "OCR" returns seeded text for sample sheets, or a deterministic transcription for uploads.
 * - Marking compares the (corrected) text with the model answer and rubric keywords.
 * Three clearly different numbers exist: AI estimate → teacher-reviewed → final official marks.
 */

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFC").replace(/[$*\\{}]/g, " ");
const words = (s: string) => norm(s).split(/[\s,.।;:()?!'"“”-]+/).filter((w) => w.length > 2);

export function handwritingSvg(lines: string[], seed: string): string {
  const h = hashString(seed);
  const tilt = ((h % 20) - 10) / 10;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = lines
    .map((t, i) => `<text x="${36 + ((h >> i) % 9)}" y="${90 + i * 40}" font-size="20" font-style="italic" font-family="'Segoe Script','Comic Sans MS',cursive" fill="#1d3a8a">${esc(t)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="760" viewBox="0 0 560 760"><rect width="560" height="760" fill="#fffdf6"/>${Array.from({ length: 17 }, (_, i) => `<line x1="20" y1="${66 + i * 40}" x2="540" y2="${66 + i * 40}" stroke="#c9dcf0"/>`).join("")}<line x1="60" y1="0" x2="60" y2="760" stroke="#f2b8b8"/><g transform="rotate(${tilt} 280 380)">${body}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface SampleSheet {
  id: string;
  title: string;
  subjectId: string;
  questionText: string;
  modelAnswer: string;
  rubric: { criterion: string; max: number; keywords: string[] }[];
  pagesText: string[][];
}

export const SAMPLE_SHEETS: SampleSheet[] = [
  {
    id: "sheet-newton",
    title: "নিউটনের দ্বিতীয় সূত্র (সৃজনশীল গ)",
    subjectId: "ssc-physics",
    questionText: "১০০০ kg ভরের গাড়ি ২০ m/s বেগ থেকে ১০ s-এ থেমে যায়। প্রযুক্ত বল নির্ণয় করো এবং নিউটনের দ্বিতীয় সূত্র ব্যাখ্যা করো।",
    modelAnswer: "নিউটনের দ্বিতীয় সূত্র: বস্তুর ভরবেগের পরিবর্তনের হার প্রযুক্ত বলের সমানুপাতিক, F = ma। মন্দন a = (0 - 20)/10 = -2 m/s²। বল F = 1000 × (-2) = -2000 N, অর্থাৎ গতির বিপরীতে 2000 N বল। একক নিউটন।",
    rubric: [
      { criterion: "সূত্রের সঠিক বিবৃতি", max: 2, keywords: ["ভরবেগ", "সমানুপাতিক", "f = ma", "ma"] },
      { criterion: "ত্বরণ/মন্দন নির্ণয়", max: 3, keywords: ["-2", "মন্দন", "a ="] },
      { criterion: "বল নির্ণয় ও একক", max: 3, keywords: ["2000", "নিউটন", "n"] },
      { criterion: "উপস্থাপনা ও সিদ্ধান্ত", max: 2, keywords: ["বিপরীত", "সুতরাং", "অতএব"] },
    ],
    pagesText: [["নিউটনের ২য় সূত্র: বলের মান", "ভরবেগের পরিবর্তনের হারের সমানুপাতিক।", "F = ma", "এখানে u = 20, v = 0, t = 10", "a = (v - u)/t = (0 - 20)/10"], ["a = -2 m/s² (মন্দন)", "F = 1000 × 2 = 2000", "সুতরাং বল 2000"]],
  },
  {
    id: "sheet-photosynthesis",
    title: "সালোকসংশ্লেষণ (বর্ণনামূলক)",
    subjectId: "ssc-biology",
    questionText: "সালোকসংশ্লেষণ কী? এর আলোক ও অন্ধকার পর্যায় সংক্ষেপে ব্যাখ্যা করো।",
    modelAnswer: "সবুজ উদ্ভিদ ক্লোরোফিলের সাহায্যে সূর্যালোকের উপস্থিতিতে কার্বন ডাইঅক্সাইড ও পানি থেকে গ্লুকোজ তৈরি করে এবং অক্সিজেন ত্যাগ করে — এটি সালোকসংশ্লেষণ। আলোক পর্যায়ে পানি বিশ্লিষ্ট হয়ে অক্সিজেন, ATP ও NADPH তৈরি হয়। অন্ধকার পর্যায়ে (ক্যালভিন চক্র) CO2 বিজারিত হয়ে গ্লুকোজ তৈরি হয়।",
    rubric: [
      { criterion: "সংজ্ঞা", max: 3, keywords: ["ক্লোরোফিল", "সূর্যালোক", "গ্লুকোজ", "অক্সিজেন"] },
      { criterion: "আলোক পর্যায়", max: 3, keywords: ["পানি", "atp", "nadph", "বিশ্লিষ্ট"] },
      { criterion: "অন্ধকার পর্যায়", max: 3, keywords: ["ক্যালভিন", "co2", "বিজারিত"] },
      { criterion: "উপস্থাপনা", max: 1, keywords: ["সমীকরণ", "চিত্র"] },
    ],
    pagesText: [["সালোকসংশ্লেষণ: সবুজ উদ্ভিদ সূর্যালোক ও", "ক্লোরোফিলের সাহায্যে CO2 ও পানি থেকে", "গ্লুকোজ তৈরি করে, অক্সিজেন বের হয়।", "আলোক পর্যায়: পানি ভেঙে অক্সিজেন হয়।", "অন্ধকার পর্যায়: CO2 থেকে গ্লুকোজ।"]],
  },
  {
    id: "sheet-quadratic",
    title: "দ্বিঘাত সমীকরণ সমাধান",
    subjectId: "ssc-math",
    questionText: "সমাধান করো: x² − 7x + 12 = 0 এবং সমাধান যাচাই করো।",
    modelAnswer: "x² − 7x + 12 = 0 → x² − 3x − 4x + 12 = 0 → x(x − 3) − 4(x − 3) = 0 → (x − 3)(x − 4) = 0 → x = 3 অথবা x = 4। যাচাই: 9 − 21 + 12 = 0, 16 − 28 + 12 = 0।",
    rubric: [
      { criterion: "মধ্যপদ বিশ্লেষণ", max: 2, keywords: ["-3x", "-4x", "3x", "4x"] },
      { criterion: "উৎপাদকে বিশ্লেষণ", max: 2, keywords: ["(x - 3)", "(x - 4)", "x-3", "x-4"] },
      { criterion: "সমাধান", max: 2, keywords: ["x = 3", "x = 4", "3, 4"] },
      { criterion: "যাচাই", max: 2, keywords: ["যাচাই", "9 - 21", "16 - 28"] },
    ],
    pagesText: [["x² - 7x + 12 = 0", "x² - 3x - 4x + 12 = 0", "x(x - 3) - 4(x - 3) = 0", "(x - 3)(x - 4) = 0", "x = 3 , x = 4"]],
  },
];

/** Rubric-based simulated marking. Pure + deterministic (unit-tested). */
export function scoreAnswer(text: string, sheet: Pick<SampleSheet, "rubric" | "modelAnswer">) {
  const t = norm(text);
  const rubric: RubricScore[] = sheet.rubric.map((r) => {
    const hits = r.keywords.filter((k) => t.includes(norm(k))).length;
    const ratio = Math.min(1, hits / Math.max(1, Math.ceil(r.keywords.length / 2)));
    return { criterion: r.criterion, max: r.max, ai: Math.round(ratio * r.max * 2) / 2 };
  });
  const modelWords = new Set(words(sheet.modelAnswer));
  const coverage = words(text).filter((w) => modelWords.has(w)).length / Math.max(1, modelWords.size);
  const aiMarks = rubric.reduce((s, r) => s + r.ai, 0);
  const max = rubric.reduce((s, r) => s + r.max, 0);
  const missing = sheet.rubric.filter((r, i) => rubric[i].ai < r.max).map((r) => `${r.criterion}: ${r.keywords.filter((k) => !t.includes(norm(k))).slice(0, 2).join(", ")}`);
  const hasNumbers = /\d/.test(text);
  const dimensions = {
    concept: Math.round(Math.min(100, Math.max(coverage * 140, (aiMarks / Math.max(1, max)) * 85))),
    calculation: hasNumbers ? Math.round((rubric.filter((r) => /নির্ণয়|সমাধান|বিশ্লেষণ/.test(r.criterion)).reduce((s, r) => s + r.ai / r.max, 0) / Math.max(1, rubric.filter((r) => /নির্ণয়|সমাধান|বিশ্লেষণ/.test(r.criterion)).length)) * 100) : 0,
    presentation: Math.min(100, 40 + text.split("\n").length * 8 + (/সুতরাং|অতএব|যাচাই/.test(text) ? 20 : 0)),
  };
  const suggestions = [
    ...(dimensions.concept < 70 ? ["মূল সংজ্ঞা ও পরিভাষা স্পষ্ট করে লেখো।"] : []),
    ...(missing.some((m) => /একক|নিউটন/.test(m)) ? ["উত্তরের শেষে একক (যেমন N, m/s²) লিখতে ভুলবে না।"] : []),
    ...(dimensions.presentation < 70 ? ["শেষে 'সুতরাং …' দিয়ে সিদ্ধান্ত লেখো এবং ধাপগুলো আলাদা লাইনে সাজাও।"] : []),
    ...(missing.some((m) => /যাচাই/.test(m)) ? ["গণিতের উত্তর মান বসিয়ে যাচাই করো।"] : []),
    "মডেল উত্তরের সাথে মিলিয়ে আবার লিখে পুনরায় চেষ্টা করো।",
  ];
  return { rubric, aiMarks, max, missing, dimensions, suggestions };
}

function seed(studentId: string): HandwritingEvaluation[] {
  if (studentId !== "u-student-1") return [];
  const mk = (sheet: SampleSheet, id: string, daysAgo: number, stage: HandwritingEvaluation["stage"], extra: Partial<HandwritingEvaluation> = {}): HandwritingEvaluation => {
    const ocr = sheet.pagesText.map((p) => p.join("\n")).join("\n");
    const s = scoreAnswer(ocr, sheet);
    return {
      id,
      studentId,
      studentName: "রাফি আহমেদ",
      title: sheet.title,
      subjectId: sheet.subjectId,
      questionText: sheet.questionText,
      modelAnswer: sheet.modelAnswer,
      pages: sheet.pagesText.map((lines, i) => ({ id: `${id}-p${i}`, name: `page-${i + 1}.jpg`, preview: handwritingSvg(lines, `${id}-${i}`), rotation: 0 })),
      ocrText: ocr,
      stage,
      rubric: s.rubric,
      maxMarks: s.max,
      aiMarks: s.aiMarks,
      dimensions: s.dimensions,
      missingPoints: s.missing,
      suggestions: s.suggestions,
      createdAt: daysFromNow(-daysAgo, 18),
      updatedAt: daysFromNow(-daysAgo + 1, 9),
      ...extra,
    };
  };
  const a = mk(SAMPLE_SHEETS[0], "ev-1", 9, "official");
  return [
    { ...a, teacherMarks: Math.min(a.maxMarks, (a.aiMarks ?? 0) + 1), officialMarks: Math.min(a.maxMarks, (a.aiMarks ?? 0) + 1), teacherComment: "সূত্র ঠিক আছে, কিন্তু বলের দিক (বিপরীত) উল্লেখ করোনি। একক 'N' লিখবে।", reviewerName: "নাসরিন সুলতানা", rubric: a.rubric.map((r, i) => ({ ...r, teacher: i === 2 ? Math.min(r.max, r.ai + 1) : r.ai })) },
    mk(SAMPLE_SHEETS[1], "ev-2", 4, "teacher_review_requested"),
    mk(SAMPLE_SHEETS[2], "ev-3", 1, "ai_estimated"),
  ];
}

const repos = new Map<string, ReturnType<typeof createMockRepository<HandwritingEvaluation>>>();
export function evaluationRepo(studentId: string) {
  let r = repos.get(studentId);
  if (!r) {
    r = createMockRepository<HandwritingEvaluation>({ collection: `evaluations:${studentId}`, seed: () => seed(studentId), defaultSort: { sortBy: "createdAt", sortOrder: "desc" }, searchFields: ["title", "questionText"] });
    repos.set(studentId, r);
  }
  return r;
}

/** Cross-student view used by the teacher portal's evaluation queue. */
export const TEACHER_VISIBLE_STUDENTS = ["u-student-1", "u-student-2"];

type EvaluateInput = Parameters<typeof evaluationService.evaluate>[1];

/** API mode: store the answer script, then the AI service marks it (pages, or the corrected text). */
async function evaluateRemote(studentId: string, input: EvaluateInput): Promise<HandwritingEvaluation> {
  const q = input.question;
  const sample = "pagesText" in q;
  const rubric: RubricScore[] = sample
    ? q.rubric.map((r) => ({ criterion: r.criterion, max: r.max, ai: 0 }))
    : (q.rubric?.length ? q.rubric : [{ criterion: "সঠিক ধারণা", marks: 3 }, { criterion: "ব্যাখ্যা ও উদাহরণ", marks: 2 }]).map((r) => ({ criterion: r.criterion, max: r.marks, ai: 0 }));
  const pages = await Promise.all(input.pages.map(async (p) => ({ ...p, preview: await toImageDataUrl(p.preview).catch(() => p.preview) })));
  const corrected = input.correctedText.trim() !== input.ocrText.trim() ? input.correctedText : "";
  const draft = await evaluationRepo(studentId).create({
    id: newId("ev"),
    studentId,
    studentName: input.studentName,
    title: input.title,
    subjectId: input.subjectId,
    questionId: sample ? undefined : q.id,
    questionText: sample ? q.questionText : q.stem,
    modelAnswer: sample ? q.modelAnswer : q.answer,
    pages,
    ocrText: input.ocrText,
    correctedText: corrected || undefined,
    stage: "uploaded",
    rubric,
    maxMarks: rubric.reduce((n, r) => n + r.max, 0),
    dimensions: { concept: 0, calculation: 0, presentation: 0 },
    missingPoints: [],
    suggestions: [],
    previousAttemptId: input.previousAttemptId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } as HandwritingEvaluation);
  const { evaluation: ev } = await remote.post<{ evaluation: HandwritingEvaluation }>(`/evaluations/${studentId}/${draft.id}/evaluate`);
  await progressService.logActivity(studentId, { kind: "practice", minutes: 10, label: "হাতের লেখা উত্তর মূল্যায়ন", xp: 20 });
  return ev;
}

export const evaluationService = {
  list: (studentId: string) => evaluationRepo(studentId).all(),
  get: (studentId: string, id: string) => evaluationRepo(studentId).get(id),

  /** Simulated OCR over uploaded page images; sample sheets return their seeded text. */
  async ocr(studentId: string, pages: EvaluationPage[], sampleId?: string) {
    if (!pages.length) invalid("NO_PAGES");
    // API mode: the AI service transcribes each page (nothing is stored; the server counts quota).
    if (isRemote()) {
      const texts: string[] = [];
      for (const [i, p] of pages.entries()) {
        const image = await toImageDataUrl(p.preview);
        const res = await remote.post<{ job: { extractedText: string } }>(`/ocr/${studentId}/solve`, { fileName: p.name, image, solve: false, save: false });
        texts.push(pages.length > 1 ? `[পৃষ্ঠা ${i + 1}]\n${res.job.extractedText}` : res.job.extractedText);
      }
      return texts.join("\n\n");
    }
    await usageService.consume(studentId, "handwriting");
    await mockRequest(1500 + pages.length * 400, { requiresNetwork: true });
    const sample = SAMPLE_SHEETS.find((s) => s.id === sampleId);
    if (sample) return sample.pagesText.map((p) => p.join("\n")).join("\n");
    return pages.map((p, i) => `[পৃষ্ঠা ${i + 1} — ${p.name}]\n(সিমুলেটেড OCR: হাতের লেখা থেকে লেখা শনাক্ত করা হয়েছে বলে ধরা হচ্ছে। এখানে তোমার উত্তরটি লিখে সংশোধন করো।)`).join("\n\n");
  },

  async evaluate(studentId: string, input: { title: string; subjectId: string; question: Pick<Question, "id" | "stem" | "answer" | "rubric"> | SampleSheet; pages: EvaluationPage[]; ocrText: string; correctedText: string; previousAttemptId?: string; studentName: string }) {
    if (isRemote()) return evaluateRemote(studentId, input);
    await mockRequest(1300, { requiresNetwork: true });
    const q = input.question;
    let sheet: Pick<SampleSheet, "rubric" | "modelAnswer">;
    if ("pagesText" in q) sheet = q;
    else {
      const keywords = words(q.answer).slice(0, 6);
      sheet = { modelAnswer: q.answer, rubric: (q.rubric?.length ? q.rubric : [{ criterion: "সঠিক ধারণা", marks: 3 }, { criterion: "ব্যাখ্যা ও উদাহরণ", marks: 2 }]).map((r) => ({ criterion: r.criterion, max: r.marks, keywords })) };
    }
    const s = scoreAnswer(input.correctedText, sheet);
    const ev = await evaluationRepo(studentId).create({
      id: newId("ev"),
      studentId,
      studentName: input.studentName,
      title: input.title,
      subjectId: input.subjectId,
      questionId: "pagesText" in input.question ? undefined : input.question.id,
      questionText: "pagesText" in input.question ? input.question.questionText : input.question.stem,
      modelAnswer: sheet.modelAnswer,
      pages: input.pages,
      ocrText: input.ocrText,
      correctedText: input.correctedText,
      stage: "ai_estimated",
      rubric: s.rubric,
      maxMarks: s.max,
      aiMarks: s.aiMarks,
      dimensions: s.dimensions,
      missingPoints: s.missing,
      suggestions: s.suggestions,
      previousAttemptId: input.previousAttemptId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await progressService.logActivity(studentId, { kind: "practice", minutes: 10, label: "হাতের লেখা উত্তর মূল্যায়ন", xp: 20 });
    return ev;
  },

  async requestTeacherReview(studentId: string, id: string) {
    await mockRequest(400);
    const ev = await evaluationRepo(studentId).update(id, { stage: "teacher_review_requested" });
    if (isRemote()) return ev; // the teacher queue reads review requests from the server
    await notificationService.push({ portal: "teacher", type: "new_assignment", title: "নতুন উত্তরপত্র পর্যালোচনার অনুরোধ", body: `${ev.studentName} — ${ev.title}`, href: "/teacher/evaluations", priority: "normal" });
    return ev;
  },

  /** Teacher review (teacher portal). */
  async teacherReview(studentId: string, id: string, input: { rubric: RubricScore[]; comment: string; reviewerName: string; finalize: boolean }) {
    await mockRequest(500);
    const teacherMarks = input.rubric.reduce((s, r) => s + (r.teacher ?? r.ai), 0);
    const evUpdate = evaluationRepo(studentId).update(id, { rubric: input.rubric, teacherMarks, teacherComment: input.comment, reviewerName: input.reviewerName, stage: input.finalize ? "official" : "teacher_reviewed", officialMarks: input.finalize ? teacherMarks : undefined });
    const ev = await evUpdate;
    // API mode: the server notifies the student when the stage changes.
    if (!isRemote()) await notificationService.push({ portal: "student", type: "teacher_feedback", title: input.finalize ? "উত্তরপত্রের চূড়ান্ত নম্বর প্রকাশিত" : "শিক্ষক তোমার উত্তরপত্র দেখেছেন", body: `${ev.title}: ${teacherMarks}/${ev.maxMarks}`, href: `/student/answer-evaluation?id=${id}`, priority: "normal" });
    return ev;
  },

  /** Teacher queue: all review requests across the teacher's students. */
  async queue() {
    if (isRemote()) return (await remote.get<HandwritingEvaluation[]>("/staff/evaluations")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await mockRequest(200);
    const lists = await Promise.all(TEACHER_VISIBLE_STUDENTS.map((s) => evaluationRepo(s).raw()));
    return lists.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  remove: (studentId: string, id: string) => evaluationRepo(studentId).remove(id),
};
