import type { AttemptAnswer, Difficulty, Exam, ExamAttempt, ExamKind, ExamResult, ExamTemplate, Question, QuestionResult, QuestionType } from "@/contracts";
import { OBJECTIVE_TYPES } from "@/contracts";
import { chapters, subjects } from "@/mock-data/curriculum";
import { bi, daysFromNow, dateKey, rng, SEED_EPOCH } from "@/mock-data/utils";
import { seededSubjects } from "@/mock-data/progress";
import { createMockRepository } from "./core/repository";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notificationService } from "./notification.service";
import { progressService } from "./progress.service";
import { estimateWritten, filterQuestions, gradeObjective, isAnswered, questionsRepo } from "./question.service";

const SYSTEM = { id: "system", name: "ShikkhaAI", role: "system" };
const TEACHER = { id: "u-teacher-1", name: "নাসরিন সুলতানা", role: "teacher" };
const INSTITUTION = { id: "u-school-1", name: "আইডিয়াল মডেল হাই স্কুল (ডেমো)", role: "school_admin" };

function exam(p: Partial<Exam> & Pick<Exam, "id" | "title" | "kind">): Exam {
  return {
    levelCode: "SSC",
    chapterIds: [],
    topicIds: [],
    questionIds: [],
    questionTypes: ["mcq"],
    difficulty: "mixed",
    durationMinutes: 30,
    totalMarks: 30,
    negativeMarking: 0,
    mode: "exam",
    randomize: true,
    reviewPolicy: "after_submit",
    status: "published",
    createdBy: SYSTEM,
    instructions: [],
    passPercent: 40,
    resultsPublished: true,
    createdAt: SEED_EPOCH,
    updatedAt: SEED_EPOCH,
    ...p,
  };
}

const DEFAULT_INSTRUCTIONS = [
  "প্রতিটি প্রশ্নের উত্তর দিতে প্রশ্ন প্যালেট ব্যবহার করে যেকোনো প্রশ্নে যাওয়া যাবে।",
  "উত্তর স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়। ইন্টারনেট বিচ্ছিন্ন হলেও পরে আবার চালিয়ে যেতে পারবে।",
  "সময় শেষ হলে পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হবে।",
  "লিখিত উত্তরের AI মূল্যায়ন একটি সিমুলেটেড অনুমান — চূড়ান্ত নম্বর শিক্ষক নির্ধারণ করবেন।",
];

export function seedExams(): Exam[] {
  return [
    exam({ id: "ex-model-phy-1", title: "পদার্থবিজ্ঞান মডেল টেস্ট ১ (অধ্যায় ১–৪)", kind: "model_test", subjectId: "ssc-physics", chapterIds: ["ssc-physics-c1", "ssc-physics-c2", "ssc-physics-c3", "ssc-physics-c4"], questionTypes: ["mcq", "numerical"], durationMinutes: 25, totalMarks: 25, negativeMarking: 0.25, instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-model-chem-1", title: "রসায়ন মডেল টেস্ট — মোল ও বিক্রিয়া", kind: "model_test", subjectId: "ssc-chemistry", chapterIds: ["ssc-chemistry-c6", "ssc-chemistry-c7"], questionTypes: ["mcq", "numerical", "short"], durationMinutes: 30, totalMarks: 30, instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-model-math-1", title: "গণিত মডেল টেস্ট — বীজগণিত", kind: "model_test", subjectId: "ssc-math", chapterIds: ["ssc-math-c5"], questionTypes: ["mcq", "numerical"], durationMinutes: 20, totalMarks: 20, instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-full-phy", title: "পদার্থবিজ্ঞান পূর্ণ সিলেবাস পরীক্ষা", kind: "full_syllabus", subjectId: "ssc-physics", chapterIds: chapters.filter((c) => c.subjectId === "ssc-physics").map((c) => c.id), questionTypes: ["mcq", "numerical", "short"], durationMinutes: 60, totalMarks: 50, negativeMarking: 0.25, instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-hsc-fin-1", title: "ফিন্যান্স মডেল টেস্ট — অর্থের সময়মূল্য", kind: "model_test", levelCode: "HSC", subjectId: "hsc-finance", chapterIds: ["hsc-finance-c3"], questionTypes: ["mcq", "numerical"], durationMinutes: 20, totalMarks: 20, instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-teacher-1", title: "শ্রেণি পরীক্ষা: বল ও গতি (শিক্ষক নির্ধারিত)", kind: "teacher_assigned", subjectId: "ssc-physics", chapterIds: ["ssc-physics-c2", "ssc-physics-c3"], questionTypes: ["mcq", "short", "creative"], durationMinutes: 40, totalMarks: 30, createdBy: TEACHER, institutionId: "inst-1", assignedTo: ["cg-10a"], scheduledAt: daysFromNow(-1, 10), closesAt: daysFromNow(3, 22), instructions: [...DEFAULT_INSTRUCTIONS, "সৃজনশীল প্রশ্নের উত্তর হাতে লিখে ছবি আপলোড করা যাবে।"] }),
    exam({ id: "ex-inst-1", title: "অর্ধবার্ষিক পরীক্ষা ২০২৬ — রসায়ন (প্রতিষ্ঠান)", kind: "institution", subjectId: "ssc-chemistry", chapterIds: chapters.filter((c) => c.subjectId === "ssc-chemistry").slice(0, 5).map((c) => c.id), questionTypes: ["mcq", "short"], durationMinutes: 45, totalMarks: 40, createdBy: INSTITUTION, institutionId: "inst-1", scheduledAt: daysFromNow(2, 10), closesAt: daysFromNow(2, 12), status: "scheduled", instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-inst-2", title: "সাপ্তাহিক ক্লাস টেস্ট — গণিত (প্রতিষ্ঠান)", kind: "institution", subjectId: "ssc-math", chapterIds: ["ssc-math-c5", "ssc-math-c8"], questionTypes: ["mcq", "numerical"], durationMinutes: 20, totalMarks: 20, createdBy: INSTITUTION, institutionId: "inst-1", scheduledAt: daysFromNow(-2, 10), closesAt: daysFromNow(5, 22), instructions: DEFAULT_INSTRUCTIONS }),
    exam({ id: "ex-board-phy-2023", title: "বোর্ড-ধাঁচ ২০২৩ পদার্থবিজ্ঞান MCQ (কৃত্রিম নমুনা)", kind: "board_previous", subjectId: "ssc-physics", boardPaperId: "bp-ssc-physics-dhaka-2023-mcq", questionTypes: ["mcq"], durationMinutes: 25, totalMarks: 25, instructions: [...DEFAULT_INSTRUCTIONS, "এটি কৃত্রিম নমুনা প্রশ্নপত্র — প্রকৃত বোর্ড প্রশ্ন নয়।"] }),
    exam({ id: "ex-oral-eng", title: "মৌখিক অনুশীলন: English speaking (ভয়েস)", kind: "oral", subjectId: "ssc-english-2", questionTypes: ["short"], durationMinutes: 10, totalMarks: 10, mode: "practice", instructions: ["ভয়েস টিউটরের মৌখিক পরীক্ষা মোডে প্রশ্নগুলো শুনে উত্তর দাও।"] }),
  ];
}

export function seedTemplates(): ExamTemplate[] {
  return [
    { id: "tpl-ssc-mcq", name: bi("SSC MCQ ধাঁচ", "SSC MCQ pattern"), kind: "model_test", description: bi("২৫টি MCQ, ২৫ মিনিট", "25 MCQs, 25 minutes"), levelCode: "SSC", durationMinutes: 25, totalMarks: 25, questionTypes: ["mcq"], negativeMarking: 0, sections: [{ title: "MCQ", type: "mcq", count: 25, marksEach: 1 }] },
    { id: "tpl-ssc-cq", name: bi("SSC সৃজনশীল ধাঁচ", "SSC creative pattern"), kind: "subject", description: bi("৫টি সৃজনশীল, ২ ঘণ্টা ৩৫ মিনিট", "5 creative questions, 2h 35m"), levelCode: "SSC", durationMinutes: 155, totalMarks: 50, questionTypes: ["creative"], negativeMarking: 0, sections: [{ title: "সৃজনশীল", type: "creative", count: 5, marksEach: 10 }] },
    { id: "tpl-quick", name: bi("দ্রুত কুইজ", "Quick quiz"), kind: "custom", description: bi("১০টি প্রশ্ন, ১০ মিনিট", "10 questions, 10 minutes"), levelCode: "SSC", durationMinutes: 10, totalMarks: 10, questionTypes: ["mcq", "true_false", "fill_blank"], negativeMarking: 0, sections: [{ title: "Mixed", type: "mcq", count: 10, marksEach: 1 }] },
  ];
}

export const examsRepo = createMockRepository<Exam>({ collection: "exams", seed: seedExams, searchFields: ["title"], entity: "Exam", idPrefix: "ex", defaultSort: { sortBy: "createdAt", sortOrder: "desc" } });
export const templatesRepo = createMockRepository<ExamTemplate>({ collection: "examTemplates", seed: seedTemplates, searchFields: ["name.bn", "name.en"], timestamps: false });

// ---------------------------------------------------------------- Grading

const GRADES: [number, string][] = [
  [80, "A+"],
  [70, "A"],
  [60, "A-"],
  [50, "B"],
  [40, "C"],
  [33, "D"],
  [0, "F"],
];
export const gradeFor = (percent: number) => GRADES.find(([min]) => percent >= min)![1];

export function scoreAttempt(exam: Pick<Exam, "negativeMarking" | "passPercent" | "totalMarks">, questions: Question[], attempt: Pick<ExamAttempt, "answers" | "timePerQuestion" | "questionOrder" | "startedAt">, submittedAt = nowIso()): ExamResult {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = attempt.questionOrder.map((id) => byId.get(id)).filter((q): q is Question => !!q);
  const rawTotal = ordered.reduce((s, q) => s + q.marks, 0) || 1;
  const scale = exam.totalMarks / rawTotal;
  let negative = 0;
  const results: QuestionResult[] = ordered.map((q) => {
    const a: AttemptAnswer | undefined = attempt.answers[q.id];
    const max = +(q.marks * scale).toFixed(2);
    const base = { questionId: q.id, type: q.type, topicId: q.topicId, chapterId: q.chapterId, difficulty: q.difficulty, max, timeSpentSec: attempt.timePerQuestion[q.id] };
    if (!isAnswered(q, a)) return { ...base, status: "unanswered" as const, awarded: 0 };
    const objective = gradeObjective(q, a);
    if (objective === true) return { ...base, status: "correct" as const, awarded: max };
    if (objective === false) {
      negative += exam.negativeMarking;
      return { ...base, status: "incorrect" as const, awarded: 0 };
    }
    const est = estimateWritten(q, a?.text ?? (a?.uploadNames?.length ? q.answer.slice(0, 40) : ""));
    return { ...base, status: "pending_review" as const, awarded: +(est.marks * scale).toFixed(2), aiEstimate: { marks: +(est.marks * scale).toFixed(2), feedback: est.feedback } };
  });
  const score = Math.max(0, +(results.reduce((s, r) => s + r.awarded, 0) - negative).toFixed(2));
  const correct = results.filter((r) => r.status === "correct").length;
  const incorrect = results.filter((r) => r.status === "incorrect").length;
  const unanswered = results.filter((r) => r.status === "unanswered").length;
  const pendingReview = results.filter((r) => r.status === "pending_review").length;
  const percent = Math.round((score / exam.totalMarks) * 100);
  const byTopicMap = new Map<string, { topicId: string; chapterId: string; correct: number; total: number }>();
  for (const r of results) {
    const key = r.topicId ?? r.chapterId;
    const e = byTopicMap.get(key) ?? { topicId: key, chapterId: r.chapterId, correct: 0, total: 0 };
    e.total += 1;
    if (r.status === "correct" || (r.status === "pending_review" && r.awarded >= r.max * 0.6)) e.correct += 1;
    byTopicMap.set(key, e);
  }
  const byTopic = [...byTopicMap.values()];
  const byDifficulty = (["easy", "medium", "hard"] as Difficulty[]).reduce(
    (acc, d) => {
      const list = results.filter((r) => r.difficulty === d);
      acc[d] = { correct: list.filter((r) => r.status === "correct").length, total: list.length };
      return acc;
    },
    {} as ExamResult["byDifficulty"],
  );
  const weakTopicIds = byTopic.filter((t) => t.total > 0 && t.correct / t.total < 0.6).map((t) => t.topicId);
  const objectiveAnswered = correct + incorrect;
  return {
    score,
    total: exam.totalMarks,
    percent,
    correct,
    incorrect,
    unanswered,
    pendingReview,
    accuracy: objectiveAnswered ? Math.round((correct / objectiveAnswered) * 100) : 0,
    timeSpentSec: Math.round((new Date(submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000),
    negativeDeducted: +negative.toFixed(2),
    passed: percent >= exam.passPercent,
    grade: gradeFor(percent),
    questions: results,
    byTopic,
    byDifficulty,
    weakTopicIds,
    recommendedChapterIds: [...new Set(byTopic.filter((t) => weakTopicIds.includes(t.topicId)).map((t) => t.chapterId))],
    containsSimulatedGrading: pendingReview > 0,
  };
}

// ---------------------------------------------------------------- Attempts (per student)

const attemptRepos = new Map<string, ReturnType<typeof createMockRepository<ExamAttempt>>>();

function seedAttemptsFor(studentId: string): ExamAttempt[] {
  const r = rng(`exam-attempts-${studentId}`);
  const subjectIds = seededSubjects(studentId);
  return Array.from({ length: 9 }, (_, i) => {
    const subjectId = subjectIds[i % subjectIds.length];
    const subject = subjects.find((s) => s.id === subjectId)!;
    const total = r.pick([20, 25, 30]);
    const percent = Math.min(98, r.int(42, 92) + i * 1);
    const score = Math.round((total * percent) / 100);
    const days = 50 - i * 5;
    const qCount = total;
    const correct = Math.round(qCount * (percent / 100));
    const startedAt = daysFromNow(-days, 17);
    const submittedAt = daysFromNow(-days, 17, 28);
    const subjectChapters = chapters.filter((c) => c.subjectId === subjectId);
    const weakChapter = subjectChapters[r.int(0, Math.max(0, Math.min(3, subjectChapters.length - 1)))];
    return {
      id: `att-seed-${studentId}-${i}`,
      examId: `ex-seed-${i}`,
      examTitle: `${subject.name.bn} — ${["অধ্যায়ভিত্তিক পরীক্ষা", "মডেল টেস্ট", "দৈনিক চ্যালেঞ্জ", "কাস্টম পরীক্ষা"][i % 4]}`,
      studentId,
      questionOrder: [],
      startedAt,
      submittedAt,
      status: "submitted" as const,
      answers: {},
      markedForReview: [],
      currentIndex: 0,
      remainingSec: 0,
      lastSavedAt: submittedAt,
      timePerQuestion: {},
      result: {
        score,
        total,
        percent,
        correct,
        incorrect: qCount - correct - 1,
        unanswered: 1,
        pendingReview: 0,
        accuracy: Math.round((correct / (qCount - 1)) * 100),
        timeSpentSec: r.int(900, 1700),
        negativeDeducted: 0,
        passed: percent >= 40,
        grade: gradeFor(percent),
        questions: [],
        byTopic: subjectChapters.slice(0, 3).map((c, j) => ({ topicId: `${c.id}-t1`, chapterId: c.id, correct: 3 - (j === 1 ? 2 : 0), total: 4 })),
        byDifficulty: { easy: { correct: 8, total: 9 }, medium: { correct: Math.max(0, correct - 12), total: 10 }, hard: { correct: 4, total: qCount - 19 } },
        weakTopicIds: [`${weakChapter.id}-t1`],
        recommendedChapterIds: [weakChapter.id],
        containsSimulatedGrading: false,
        teacherFeedback: i === 6 ? { by: "নাসরিন সুলতানা", text: "সময় ব্যবস্থাপনা ভালো হয়েছে। গাণিতিক সমস্যায় একক লিখতে ভুলো না।", at: daysFromNow(-days + 1) } : undefined,
      },
    } satisfies ExamAttempt;
  });
}

export function examAttemptsRepo(studentId: string) {
  let r = attemptRepos.get(studentId);
  if (!r) {
    r = createMockRepository<ExamAttempt>({ collection: `examAttempts:${studentId}`, seed: () => seedAttemptsFor(studentId), timestamps: false, searchFields: ["examTitle"], defaultSort: { sortBy: "startedAt", sortOrder: "desc" }, latency: 120 });
    attemptRepos.set(studentId, r);
  }
  return r;
}

// ---------------------------------------------------------------- Setup

export interface ExamSetup {
  kind: ExamKind;
  title?: string;
  subjectId?: string;
  chapterIds: string[];
  topicIds: string[];
  types: QuestionType[];
  count: number;
  difficulty: Difficulty | "mixed";
  durationMinutes: number;
  negativeMarking: number;
  mode: "practice" | "exam";
  randomize: boolean;
  reviewPolicy: Exam["reviewPolicy"];
  levelCode?: "SSC" | "HSC";
}

async function pickQuestions(setup: Pick<ExamSetup, "subjectId" | "chapterIds" | "topicIds" | "types" | "difficulty" | "levelCode">, count: number, seed: string, preferTopicIds?: string[]) {
  const all = await questionsRepo.raw();
  let pool = filterQuestions(all, { subjectId: setup.subjectId, levelCode: setup.subjectId ? undefined : setup.levelCode, types: setup.types.length ? setup.types : undefined, difficulty: setup.difficulty === "mixed" ? undefined : [setup.difficulty] });
  if (setup.chapterIds.length) pool = pool.filter((q) => setup.chapterIds.includes(q.chapterId));
  if (setup.topicIds.length) pool = pool.filter((q) => q.topicId && setup.topicIds.includes(q.topicId));
  const r = rng(seed);
  if (preferTopicIds?.length) {
    const weak = r.shuffle(pool.filter((q) => q.topicId && preferTopicIds.includes(q.topicId)));
    const rest = r.shuffle(pool.filter((q) => !weak.includes(q)));
    return [...weak, ...rest].slice(0, count);
  }
  // Balance types: interleave by type so mixed exams aren't dominated by one type.
  const byType = new Map<string, Question[]>();
  for (const q of r.shuffle(pool)) byType.set(q.type, [...(byType.get(q.type) ?? []), q]);
  const out: Question[] = [];
  while (out.length < count && [...byType.values()].some((l) => l.length)) for (const list of byType.values()) if (list.length && out.length < count) out.push(list.shift()!);
  return out;
}

const KIND_TITLES: Partial<Record<ExamKind, string>> = {
  chapter: "অধ্যায়ভিত্তিক পরীক্ষা",
  topic: "টপিকভিত্তিক পরীক্ষা",
  subject: "বিষয়ভিত্তিক পরীক্ষা",
  full_syllabus: "পূর্ণ সিলেবাস পরীক্ষা",
  adaptive: "অ্যাডাপটিভ পরীক্ষা",
  custom: "কাস্টম পরীক্ষা",
  mixed: "মিশ্র অনুশীলন",
  daily_challenge: "দৈনিক চ্যালেঞ্জ",
};

export const examService = {
  list: () => examsRepo.all(),
  get: (id: string) => examsRepo.get(id),
  templates: () => templatesRepo.all(),
  attempts: (studentId: string) => examAttemptsRepo(studentId).all(),
  attempt: (studentId: string, id: string) => examAttemptsRepo(studentId).get(id),

  /** Creates a personal exam from the setup form (EXM-14…16) and returns the new attempt id. */
  async createAndStart(studentId: string, setup: ExamSetup): Promise<string> {
    await mockRequest(400);
    let prefer: string[] | undefined;
    if (setup.kind === "adaptive") {
      const mastery = await progressService.mastery(studentId);
      prefer = mastery.filter((m) => !setup.subjectId || m.subjectId === setup.subjectId).sort((a, b) => a.mastery - b.mastery).slice(0, 6).map((m) => m.topicId);
    }
    const picked = await pickQuestions(setup, setup.count, `${studentId}-${Date.now()}`, prefer);
    if (!picked.length) invalid("NO_QUESTIONS");
    const subject = subjects.find((s) => s.id === setup.subjectId);
    const created = await examsRepo.create({
      ...exam({ id: newId("ex"), title: setup.title || `${subject ? `${subject.name.bn} — ` : ""}${KIND_TITLES[setup.kind] ?? "পরীক্ষা"}`, kind: setup.kind }),
      levelCode: subject?.levelCode ?? setup.levelCode ?? "SSC",
      subjectId: setup.subjectId,
      chapterIds: setup.chapterIds,
      topicIds: setup.topicIds,
      questionIds: picked.map((q) => q.id),
      questionTypes: setup.types,
      difficulty: setup.difficulty,
      durationMinutes: setup.durationMinutes,
      totalMarks: picked.reduce((s, q) => s + q.marks, 0),
      negativeMarking: setup.negativeMarking,
      mode: setup.mode,
      randomize: setup.randomize,
      reviewPolicy: setup.reviewPolicy,
      status: "published",
      createdBy: { id: studentId, name: "student", role: "student" },
      instructions: DEFAULT_INSTRUCTIONS,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    return examService.start(studentId, created.id);
  },

  /** Daily challenge: same 10 questions for everyone today (seeded by date). */
  async startDailyChallenge(studentId: string, levelCode: "SSC" | "HSC" = "SSC") {
    const id = `ex-daily-${dateKey(0)}-${levelCode}`;
    if (!(await examsRepo.find(id))) {
      const picked = await pickQuestions({ chapterIds: [], topicIds: [], types: ["mcq", "true_false"], difficulty: "mixed", levelCode }, 10, `daily-${dateKey(0)}`);
      await examsRepo.create({ ...exam({ id, title: `দৈনিক চ্যালেঞ্জ — ${dateKey(0)}`, kind: "daily_challenge" }), levelCode, questionIds: picked.map((q) => q.id), durationMinutes: 10, totalMarks: picked.length, questionTypes: ["mcq", "true_false"], mode: "exam", instructions: ["১০টি প্রশ্ন, ১০ মিনিট। প্রতিদিন নতুন চ্যালেঞ্জ!"] });
    }
    return examService.start(studentId, id);
  },

  /** Starts (or resumes) an attempt for an exam. */
  async start(studentId: string, examId: string): Promise<string> {
    await mockRequest(250);
    const repo = examAttemptsRepo(studentId);
    const existing = (await repo.raw()).find((a) => a.examId === examId && a.status === "in_progress");
    if (existing) return existing.id;
    const ex = await examsRepo.get(examId);
    let ids = ex.questionIds;
    if (!ids.length) {
      // Catalogue exams pick their questions at attempt time from their chapter scope.
      const picked = await pickQuestions({ subjectId: ex.subjectId, chapterIds: ex.chapterIds, topicIds: ex.topicIds, types: ex.questionTypes, difficulty: ex.difficulty, levelCode: ex.levelCode }, Math.max(5, Math.min(25, Math.round(ex.totalMarks / 1.2))), `${examId}-${studentId}`);
      ids = picked.map((q) => q.id);
    }
    const order = ex.randomize ? rng(`${examId}-${Date.now()}`).shuffle(ids) : ids;
    const stamp = nowIso();
    const attempt = await repo.create({
      id: newId("att"),
      examId,
      examTitle: ex.title,
      studentId,
      questionOrder: order,
      startedAt: stamp,
      status: "in_progress",
      answers: {},
      markedForReview: [],
      currentIndex: 0,
      remainingSec: ex.durationMinutes * 60,
      lastSavedAt: stamp,
      timePerQuestion: {},
    });
    return attempt.id;
  },

  /** Autosave (EXM-25). Uses no artificial latency so it never blocks typing. */
  async save(studentId: string, attemptId: string, patch: Partial<Pick<ExamAttempt, "answers" | "markedForReview" | "currentIndex" | "remainingSec" | "timePerQuestion">>) {
    const repo = examAttemptsRepo(studentId);
    const items = await repo.raw();
    const i = items.findIndex((a) => a.id === attemptId);
    if (i === -1) return;
    const next = [...items];
    next[i] = { ...items[i], ...patch, lastSavedAt: nowIso() };
    await repo.replaceAll(next);
    return next[i];
  },

  async submit(studentId: string, attemptId: string, reason: "manual" | "time_expired" = "manual") {
    await mockRequest(500);
    const repo = examAttemptsRepo(studentId);
    const attempt = await repo.get(attemptId);
    if (attempt.status !== "in_progress") return attempt;
    const ex = await examsRepo.get(attempt.examId);
    const questions = await questionsRepoMany(attempt.questionOrder);
    const submittedAt = nowIso();
    const result = scoreAttempt({ ...ex, totalMarks: ex.questionIds.length ? ex.totalMarks : questions.reduce((s, q) => s + q.marks, 0) }, questions, attempt, submittedAt);
    const updated = await repo.update(attemptId, { status: reason === "time_expired" ? "expired" : "submitted", submittedAt, result, remainingSec: 0 });
    await progressService.recordAttempts(
      studentId,
      result.questions
        .filter((r) => r.status === "correct" || r.status === "incorrect" || (r.status === "pending_review" && OBJECTIVE_TYPES.includes(r.type) === false))
        .map((r) => ({ questionId: r.questionId, subjectId: questions.find((q) => q.id === r.questionId)!.subjectId, chapterId: r.chapterId, topicId: r.topicId, correct: r.status === "correct" || (r.status === "pending_review" && r.awarded >= r.max * 0.6), source: "exam" as const, timeSpentSec: r.timeSpentSec })),
      { minutes: Math.max(1, Math.round(result.timeSpentSec / 60)), label: ex.title },
    );
    if (result.percent === 100) await progressService.grantBadge(studentId, "exam-perfect");
    await notificationService.push({ portal: "student", type: "exam_result", title: `ফলাফল: ${ex.title}`, body: `${result.score}/${result.total} (${result.percent}%) · গ্রেড ${result.grade}`, href: `/student/exams/results/${attemptId}`, priority: "normal" });
    return updated;
  },

  async discard(studentId: string, attemptId: string) {
    await examAttemptsRepo(studentId).remove(attemptId);
  },
};

async function questionsRepoMany(ids: string[]) {
  const all = await questionsRepo.raw();
  const map = new Map(all.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter((q): q is Question => !!q);
}
