import type { BoardPaper, InstitutionExamCategory, InstitutionPaper, LevelCode, Question } from "@/contracts";
import { CURRENT_VERSION_ID, ARCHIVED_VERSION_ID, boards, chapters, subjects } from "@/mock-data/curriculum";
import { questions as seedQuestions } from "@/mock-data/questions";
import { institutions } from "@/mock-data/users";
import { bi, daysFromNow, hashString, rng, SEED_EPOCH } from "@/mock-data/utils";
import { createMockRepository, matchesSearch } from "./core/repository";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { examAttemptsRepo, examService, examsRepo } from "./exam.service";
import { questionsRepo, reportsRepo } from "./question.service";
import { registerSearchProvider, scoreText } from "./search.service";

// ---------------------------------------------------------------------------
// Board archive (§14)
// ---------------------------------------------------------------------------

/**
 * Exam years per level. Every paper is a clearly labelled SYNTHETIC SAMPLE in the board's style —
 * never presented as a real historical paper. HSC 2020 is omitted because that examination was
 * not held (results were assessed without a public exam), so no "paper" may exist for it.
 */
export const BOARD_YEARS: Record<LevelCode, number[]> = {
  SSC: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  HSC: [2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025],
};
/** Years sat on a shortened syllabus — flagged on papers for relevance. */
const SHORT_SYLLABUS_YEARS = new Set([2021, 2022]);

const MCQ_TYPES = new Set(["mcq", "true_false", "fill_blank"]);

function poolFor(subjectId: string) {
  const all = seedQuestions.filter((q) => q.subjectId === subjectId && q.status === "published");
  return { mcq: all.filter((q) => MCQ_TYPES.has(q.type)), written: all.filter((q) => !MCQ_TYPES.has(q.type)) };
}

/** Deterministic composition: each paper reuses ~40% "core" concepts so frequency analysis is meaningful. */
function compose(pool: Question[], seed: string, count: number): string[] {
  if (!pool.length) return [];
  const r = rng(seed);
  const coreSize = Math.max(1, Math.round(pool.length * 0.35));
  const core = pool.slice(0, coreSize);
  const rest = pool.slice(coreSize);
  const picked = [...r.shuffle(core).slice(0, Math.ceil(count * 0.4)), ...r.shuffle(rest)];
  return [...new Set(picked.map((q) => q.id))].slice(0, Math.min(count, pool.length));
}

export function seedBoardPapers(): BoardPaper[] {
  const out: BoardPaper[] = [];
  const subjectList = subjects.filter((s) => {
    const p = poolFor(s.id);
    return p.mcq.length >= 4 || p.written.length >= 3;
  });
  for (const s of subjectList) {
    const pool = poolFor(s.id);
    for (const year of BOARD_YEARS[s.levelCode]) {
      for (const board of boards) {
        for (const examType of ["mcq", "creative"] as const) {
          const list = examType === "mcq" ? pool.mcq : pool.written;
          if (list.length < (examType === "mcq" ? 4 : 3)) continue;
          const id = `bp-${s.id}-${board.code}-${year}-${examType}`;
          const qids = compose(list, id, examType === "mcq" ? 25 : 8);
          const h = hashString(id);
          out.push({
            id,
            levelCode: s.levelCode,
            boardId: board.id,
            year,
            subjectId: s.id,
            paperNumber: 1,
            curriculumVersionId: year < 2024 ? ARCHIVED_VERSION_ID : CURRENT_VERSION_ID,
            examType,
            title: `${board.name.bn} · ${s.name.bn} · ${year} · ${examType === "mcq" ? "বহুনির্বাচনী" : "সৃজনশীল"} (কৃত্রিম নমুনা)`,
            durationMinutes: examType === "mcq" ? 25 : 155,
            totalMarks: examType === "mcq" ? 25 : 50,
            questionIds: qids,
            solved: h % 5 !== 0,
            provenance: "synthetic_sample",
            authenticity: { status: "synthetic_sample", originalSource: "ShikkhaAI synthetic sample generator — not an official board paper", scanAvailable: h % 4 === 0, transcriptVerified: false, permission: "demo_only" },
            syllabusVersionLabel: year < 2024 ? "শিক্ষাক্রম ২০১২ (পূর্ববর্তী বিন্যাস)" : "শিক্ষাক্রম ২০১২ (সংশোধিত)",
            status: "published",
            relevanceWarning: SHORT_SYLLABUS_YEARS.has(year) ? "সংক্ষিপ্ত সিলেবাসে নেওয়া পরীক্ষার ধাঁচ — সব অধ্যায় অন্তর্ভুক্ত নয়।" : year < 2019 ? "পুরনো ধাঁচ — বর্তমান সিলেবাসের সাথে কিছু পার্থক্য থাকতে পারে।" : undefined,
          });
        }
      }
    }
  }
  return out;
}

export const boardPapersRepo = createMockRepository<BoardPaper>({ collection: "boardPapers", seed: seedBoardPapers, timestamps: false, searchFields: ["title"], latency: 150, entity: "BoardPaper" });

export interface BoardFilters {
  levelCode?: LevelCode;
  boardId?: string;
  year?: number;
  subjectId?: string;
  examType?: BoardPaper["examType"];
  curriculumVersionId?: string;
  solvedOnly?: boolean;
}

export interface ConceptStat {
  topicId?: string;
  chapterId: string;
  count: number;
  years: number[];
  questionIds: string[];
}

export const boardService = {
  async papers(f: BoardFilters) {
    await mockRequest(160);
    return (await boardPapersRepo.raw())
      .filter(
        (p) =>
          p.status === "published" &&
          (!f.levelCode || p.levelCode === f.levelCode) &&
          (!f.boardId || p.boardId === f.boardId) &&
          (!f.year || p.year === f.year) &&
          (!f.subjectId || p.subjectId === f.subjectId) &&
          (!f.examType || p.examType === f.examType) &&
          (!f.curriculumVersionId || p.curriculumVersionId === f.curriculumVersionId) &&
          (!f.solvedOnly || p.solved),
      )
      .sort((a, b) => b.year - a.year || a.boardId.localeCompare(b.boardId) || a.examType.localeCompare(b.examType));
  },
  get: (id: string) => boardPapersRepo.get(id),
  async paperWithQuestions(id: string) {
    const paper = await boardPapersRepo.get(id);
    const all = await questionsRepo.raw();
    const byId = new Map(all.map((q) => [q.id, q]));
    return { paper, questions: paper.questionIds.map((qid) => byId.get(qid)).filter(Boolean) as Question[] };
  },

  /** Concept frequency & repetition across years for one subject (optionally one board). */
  async analysis(subjectId: string, boardId?: string) {
    await mockRequest(250);
    const papers = (await boardPapersRepo.raw()).filter((p) => p.subjectId === subjectId && (!boardId || p.boardId === boardId));
    const all = new Map((await questionsRepo.raw()).map((q) => [q.id, q]));
    const byTopic = new Map<string, ConceptStat>();
    const byChapterYear = new Map<string, Record<number, number>>();
    const typeCounts: Record<string, number> = {};
    for (const p of papers) {
      for (const qid of p.questionIds) {
        const q = all.get(qid);
        if (!q) continue;
        const key = q.topicId ?? q.chapterId;
        const stat = byTopic.get(key) ?? { topicId: q.topicId, chapterId: q.chapterId, count: 0, years: [], questionIds: [] };
        stat.count += 1;
        if (!stat.years.includes(p.year)) stat.years.push(p.year);
        if (!stat.questionIds.includes(q.id)) stat.questionIds.push(q.id);
        byTopic.set(key, stat);
        const cy = byChapterYear.get(q.chapterId) ?? {};
        cy[p.year] = (cy[p.year] ?? 0) + 1;
        byChapterYear.set(q.chapterId, cy);
        typeCounts[q.type] = (typeCounts[q.type] ?? 0) + 1;
      }
    }
    const concepts = [...byTopic.values()].sort((a, b) => b.years.length - a.years.length || b.count - a.count);
    return { paperCount: papers.length, concepts, byChapterYear: Object.fromEntries(byChapterYear), typeCounts, years: [...new Set(papers.map((p) => p.year))].sort() };
  },

  /** Practice a full paper (untimed) or sit it as a timed previous-year exam. */
  async startPaper(studentId: string, paperId: string, timed: boolean) {
    await mockRequest(300);
    const paper = await boardPapersRepo.get(paperId);
    if (!paper.questionIds.length) invalid("NO_QUESTIONS");
    const examId = `ex-${paper.id}-${timed ? "timed" : "practice"}`;
    if (!(await examsRepo.find(examId))) {
      await examsRepo.create({
        id: examId,
        title: `${paper.title}${timed ? "" : " — অনুশীলন"}`,
        kind: "board_previous",
        levelCode: paper.levelCode,
        subjectId: paper.subjectId,
        chapterIds: [],
        topicIds: [],
        questionIds: paper.questionIds,
        questionTypes: paper.examType === "mcq" ? ["mcq"] : ["creative", "descriptive", "short"],
        difficulty: "mixed",
        durationMinutes: paper.durationMinutes,
        totalMarks: paper.totalMarks,
        negativeMarking: 0,
        mode: timed ? "exam" : "practice",
        randomize: false,
        reviewPolicy: timed ? "after_submit" : "immediate",
        status: "published",
        createdBy: { id: "system", name: "ShikkhaAI", role: "system" },
        instructions: ["এটি কৃত্রিম নমুনা প্রশ্নপত্র — প্রকৃত বোর্ড প্রশ্ন নয়।", timed ? "সময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে।" : "অনুশীলন মোড: সময়ের চাপ নেই, প্রতিটি উত্তর সাথে সাথে যাচাই করা যাবে।"],
        passPercent: 33,
        resultsPublished: true,
        boardPaperId: paper.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    return examService.start(studentId, examId);
  },

  async attemptsFor(studentId: string, paperId: string) {
    return (await examAttemptsRepo(studentId).raw()).filter((a) => a.examId.startsWith(`ex-${paperId}-`));
  },
};

registerSearchProvider("board_paper", async (q) =>
  (await boardPapersRepo.raw())
    .filter((p) => p.examType === "mcq" && matchesSearch(p, q, ["title"]))
    .slice(0, 15)
    .map((p) => ({ kind: "board_paper" as const, id: p.id, title: { bn: p.title, en: p.title }, subtitle: { bn: "বোর্ড প্রশ্ন (কৃত্রিম নমুনা)", en: "Board-style paper (synthetic sample)" }, href: `/student/board-questions/${p.id}`, score: scoreText(p.title, q) - 3, subjectId: p.subjectId })),
);

// ---------------------------------------------------------------------------
// School & college archive (§15)
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<InstitutionExamCategory, string> = {
  annual: "বার্ষিক পরীক্ষা",
  half_yearly: "অর্ধবার্ষিক পরীক্ষা",
  pre_test: "প্রাক-নির্বাচনী পরীক্ষা",
  test: "টেস্ট পরীক্ষা",
  selection_test: "নির্বাচনী পরীক্ষা",
  terminal: "সাময়িক পরীক্ষা",
  class_test: "ক্লাস টেস্ট",
  model_test: "মডেল টেস্ট",
  custom: "বিশেষ পরীক্ষা",
};

/** Seeded "scan" rendering: an SVG page that looks like a printed paper (synthetic). */
export function scanSvg(title: string, lines: string[], seed: string): string {
  const r = rng(seed);
  const tilt = (r.next() - 0.5) * 1.2;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\$[^$]*\$/g, "[সূত্র]").replace(/\*\*/g, "");
  const body = lines
    .slice(0, 14)
    .map((t, i) => `<text x="40" y="${130 + i * 34}" font-size="15" fill="#222">${i + 1}. ${esc(t).slice(0, 62)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842"><rect width="595" height="842" fill="#fbfaf6"/><g transform="rotate(${tilt.toFixed(2)} 297 421)"><text x="297" y="60" font-size="18" text-anchor="middle" font-weight="bold" fill="#111">${esc(title).slice(0, 48)}</text><text x="297" y="88" font-size="12" text-anchor="middle" fill="#555">কৃত্রিম নমুনা — ডেমো স্ক্যান</text><line x1="40" y1="100" x2="555" y2="100" stroke="#999"/>${body}</g><rect x="0" y="0" width="595" height="842" fill="url(#n)" opacity="0.04"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function seedInstitutionPapers(): InstitutionPaper[] {
  const r = rng("inst-papers");
  const cats = Object.keys(CATEGORY_LABEL) as InstitutionExamCategory[];
  const usable = subjects.filter((s) => seedQuestions.filter((q) => q.subjectId === s.id).length >= 4);
  const out: InstitutionPaper[] = [];
  for (let i = 0; i < 42; i++) {
    const inst = institutions[i % institutions.length];
    const s = usable[(i * 7) % usable.length];
    const levelCode = s.levelCode;
    const grade = levelCode === "SSC" ? r.pick([9, 10]) : r.pick([11, 12]);
    const category = cats[i % cats.length];
    const year = String(r.pick([2024, 2025, 2026]));
    const pool = seedQuestions.filter((q) => q.subjectId === s.id);
    const qs = r.shuffle(pool).slice(0, Math.min(10, pool.length));
    const title = `${inst.name.bn.replace(" (ডেমো)", "")} — ${CATEGORY_LABEL[category]} ${year}, ${s.name.bn}`;
    const id = `ip-${i + 1}`;
    out.push({
      id,
      institutionId: inst.id,
      title,
      academicYear: year,
      grade,
      levelCode,
      subjectId: s.id,
      category,
      visibility: i % 6 === 5 ? "private" : "public",
      uploadedBy: { id: i % 2 ? "u-teacher-1" : "u-school-1", name: i % 2 ? "নাসরিন সুলতানা" : "প্রতিষ্ঠান অ্যাডমিন", role: i % 2 ? "teacher" : "school_admin" },
      questionIds: qs.map((q) => q.id),
      scanPages: [scanSvg(title, qs.slice(0, 7).map((q) => q.stem), id), scanSvg(title, qs.slice(7).map((q) => q.stem), `${id}-2`)].slice(0, qs.length > 7 ? 2 : 1),
      extractedText: qs.map((q, n) => `${n + 1}. ${q.stem.replace(/\*\*/g, "")}`).join("\n"),
      verifiedSolutions: i % 3 !== 2,
      duplicateOfId: i === 13 ? "ip-1" : i === 27 ? "ip-6" : undefined,
      license: i % 9 === 8 ? "pending" : "granted",
      moderation: i % 11 === 10 ? "pending" : i === 20 ? "rejected" : "approved",
      moderationNote: i === 20 ? "স্ক্যান অস্পষ্ট; পুনরায় আপলোড প্রয়োজন।" : undefined,
      provenance: i % 2 ? "teacher_uploaded" : "institution_uploaded",
      reportCount: i % 8 === 3 ? 2 : 0,
      createdAt: daysFromNow(-r.int(5, 300)),
      updatedAt: SEED_EPOCH,
    });
  }
  return out;
}

export const institutionPapersRepo = createMockRepository<InstitutionPaper>({ collection: "institutionPapers", seed: seedInstitutionPapers, searchFields: ["title", "extractedText"], latency: 150, entity: "InstitutionPaper" });

export const INSTITUTION_CATEGORY_LABELS: Record<InstitutionExamCategory, [string, string]> = {
  annual: ["বার্ষিক", "Annual"],
  half_yearly: ["অর্ধবার্ষিক", "Half-yearly"],
  pre_test: ["প্রাক-নির্বাচনী", "Pre-test"],
  test: ["টেস্ট", "Test"],
  selection_test: ["নির্বাচনী", "Selection test"],
  terminal: ["সাময়িক", "Terminal"],
  class_test: ["ক্লাস টেস্ট", "Class test"],
  model_test: ["মডেল টেস্ট", "Model test"],
  custom: ["বিশেষ", "Custom"],
};

export interface InstitutionPaperFilters {
  institutionId?: string;
  district?: string;
  type?: string;
  academicYear?: string;
  grade?: number;
  subjectId?: string;
  category?: InstitutionExamCategory;
  search?: string;
  /** Viewer's own institution: private papers from it are visible. */
  viewerInstitutionId?: string;
}

export const institutionArchiveService = {
  institutions: async () => {
    await mockRequest(120);
    return institutions;
  },
  async papers(f: InstitutionPaperFilters) {
    await mockRequest(160);
    const insts = new Map(institutions.map((i) => [i.id, i]));
    return (await institutionPapersRepo.raw())
      .filter((p) => {
        const inst = insts.get(p.institutionId);
        return (
          p.moderation === "approved" &&
          p.license === "granted" &&
          (p.visibility === "public" || p.institutionId === f.viewerInstitutionId) &&
          (!f.institutionId || p.institutionId === f.institutionId) &&
          (!f.district || inst?.district === f.district) &&
          (!f.type || inst?.type === f.type) &&
          (!f.academicYear || p.academicYear === f.academicYear) &&
          (!f.grade || p.grade === f.grade) &&
          (!f.subjectId || p.subjectId === f.subjectId) &&
          (!f.category || p.category === f.category) &&
          matchesSearch(p, f.search, ["title", "extractedText"])
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async paperWithQuestions(id: string) {
    const paper = await institutionPapersRepo.get(id);
    const all = new Map((await questionsRepo.raw()).map((q) => [q.id, q]));
    return { paper, questions: paper.questionIds.map((q) => all.get(q)).filter(Boolean) as Question[], institution: institutions.find((i) => i.id === paper.institutionId)! };
  },
  async report(paperId: string, reporterId: string, reason: string, details?: string) {
    const p = await institutionPapersRepo.get(paperId);
    await institutionPapersRepo.update(paperId, { reportCount: p.reportCount + 1 });
    return reportsRepo.create({ id: newId("rep"), kind: "institution_paper", refId: paperId, reason, details, reporterId, status: "open", createdAt: nowIso() });
  },
};

export const institutionCategoryText = (c: InstitutionExamCategory) => CATEGORY_LABEL[c];
export const chapterTitleOf = (id: string) => chapters.find((c) => c.id === id)?.title ?? bi(id, id);

registerSearchProvider("institution_paper", async (q) =>
  (await institutionPapersRepo.raw())
    .filter((p) => p.moderation === "approved" && p.visibility === "public" && matchesSearch(p, q, ["title"]))
    .slice(0, 10)
    .map((p) => ({ kind: "institution_paper" as const, id: p.id, title: { bn: p.title, en: p.title }, subtitle: { bn: "স্কুল-কলেজের প্রশ্ন", en: "School/college paper" }, href: `/student/institution-questions/${p.id}`, score: scoreText(p.title, q) - 3, subjectId: p.subjectId })),
);
