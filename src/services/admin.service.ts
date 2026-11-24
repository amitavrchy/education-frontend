import { INGESTION_STAGES, type AiLogEntry, type AiSettings, type ApiKeySetting, type AuditLog, type EvalDataset, type IngestionJob, type IngestionStage, type KbCollection, type ModerationCase, type PromptTemplate, type SecurityAlert, type SessionRecord, type SystemConfig, type TutorContext } from "@/contracts";
import type { UserRole } from "@/types";
import { getDocument, saveDocument } from "@/lib/mock-db";
import { ROLE_PERMISSIONS, type Permission, type PermissionMatrix } from "@/lib/auth/permissions";
import { subjects } from "@/mock-data/curriculum";
import { daysFromNow, rng, SEED_EPOCH } from "@/mock-data/utils";
import { retrieve } from "./ai/tutor-engine";
import { createMockRepository } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { booksRepo } from "./library.service";
import { passagesRepo } from "./kb.service";

/**
 * Admin back-office services (§30–42). Every number is mock/demo data generated locally.
 */

// ---------------------------------------------------------------- Audit log

const ADMINS = [
  { id: "u-sadmin-1", name: "সিস্টেম সুপার অ্যাডমিন", role: "super_admin" },
  { id: "u-padmin-1", name: "নুসরাত জাহান", role: "platform_admin" },
  { id: "u-cm-1", name: "তানজিলা রহমান", role: "content_manager" },
  { id: "u-support-1", name: "সাকিব হোসেন", role: "support" },
];

function seedAudit(): AuditLog[] {
  const r = rng("audit");
  const actions: [AuditLog["category"], string, string][] = [
    ["content", "question.publish", "প্রশ্ন প্রকাশ"],
    ["content", "book.ingest", "বই ইনজেস্ট শুরু"],
    ["account", "user.suspend", "অ্যাকাউন্ট স্থগিত"],
    ["account", "user.role_change", "ভূমিকা পরিবর্তন"],
    ["security", "permission.update", "পারমিশন হালনাগাদ"],
    ["billing", "coupon.create", "কুপন তৈরি"],
    ["system", "config.update", "সিস্টেম কনফিগ হালনাগাদ"],
    ["ai", "prompt.activate", "প্রম্পট সংস্করণ সক্রিয়"],
    ["content", "chapter.update", "অধ্যায় সম্পাদনা"],
  ];
  return Array.from({ length: 60 }, (_, i) => {
    const [category, action, label] = r.pick(actions);
    const actor = r.pick(ADMINS);
    return { id: `al-${i + 1}`, at: daysFromNow(-r.int(0, 30), r.int(8, 22), r.int(0, 59)), actor, category, action, target: { type: action.split(".")[0], id: `obj-${r.int(100, 999)}`, label }, details: `${label} (ডেমো লগ)`, ip: `10.0.${r.int(0, 9)}.${r.int(2, 250)}` };
  }).sort((a, b) => b.at.localeCompare(a.at));
}
export const auditRepo = createMockRepository<AuditLog>({ collection: "auditLogs", seed: seedAudit, timestamps: false, searchFields: ["action", "target.label", "actor.name"], defaultSort: { sortBy: "at", sortOrder: "desc" } });

export async function audit(actor: { id: string; name: string; role: string }, category: AuditLog["category"], action: string, target: AuditLog["target"], details?: string) {
  return auditRepo.create({ id: newId("al"), at: nowIso(), actor, category, action, target, details, ip: "127.0.0.1" });
}

// ---------------------------------------------------------------- Ingestion pipeline

function seedJobs(): IngestionJob[] {
  const mk = (id: string, bookId: string, title: string, upTo: number, failAt?: IngestionStage, waiting = false): IngestionJob => {
    const stages = INGESTION_STAGES.map((stage, i) => ({ stage, status: (i < upTo ? "succeeded" : i === upTo ? (failAt === stage ? "failed" : waiting ? "waiting_review" : "running") : "pending") as IngestionJob["stages"][number]["status"], startedAt: i <= upTo ? daysFromNow(-1, 9, i * 3) : undefined, finishedAt: i < upTo ? daysFromNow(-1, 9, i * 3 + 2) : undefined, message: failAt === stage && i === upTo ? "OCR confidence 41% < 70% threshold on pages 33–36" : undefined }));
    const stage = INGESTION_STAGES[Math.min(upTo, INGESTION_STAGES.length - 1)];
    return {
      id,
      bookId,
      bookTitle: title,
      fileName: `${bookId}.pdf`,
      fileSizeKb: 18_000 + upTo * 900,
      stage,
      stageStatus: failAt ? "failed" : waiting ? "waiting_review" : upTo >= INGESTION_STAGES.length ? "succeeded" : "running",
      progress: Math.round((upTo / INGESTION_STAGES.length) * 100),
      stages,
      logs: [
        { at: daysFromNow(-1, 9), level: "info", message: "Upload received; checksum OK" },
        ...(upTo > 2 ? [{ at: daysFromNow(-1, 9, 8), level: "info" as const, message: "Extracted 96 pages of text" }] : []),
        ...(failAt ? [{ at: daysFromNow(-1, 9, 12), level: "error" as const, message: "OCR failed on scanned pages 33–36 (low contrast)" }] : []),
        ...(waiting ? [{ at: daysFromNow(-1, 9, 30), level: "warn" as const, message: "Quality check passed with 3 warnings; waiting for reviewer" }] : []),
      ],
      failAt,
      chunkCount: upTo > 5 ? 380 + upTo * 10 : 0,
      pagesProcessed: Math.min(96, upTo * 12),
      createdAt: daysFromNow(-1, 9),
      updatedAt: daysFromNow(-1, 10),
    };
  };
  return [
    { ...mk("ing-1", "book-ssc-physics-bn", "পদার্থবিজ্ঞান (২০২৬)", 11), stageStatus: "succeeded", progress: 100, stage: "publish" },
    mk("ing-2", "book-ssc-chemistry-bn", "রসায়ন (২০২৬)", 3, "ocr"),
    mk("ing-3", "book-ssc-biology-bn", "জীববিজ্ঞান (২০২৬)", 9, undefined, true),
    mk("ing-4", "book-ssc-math-en", "General Mathematics (EV)", 6),
  ];
}
export const ingestionRepo = createMockRepository<IngestionJob>({ collection: "ingestionJobs", seed: seedJobs, entity: "IngestionJob", defaultSort: { sortBy: "createdAt", sortOrder: "desc" } });

export const ingestionService = {
  list: () => ingestionRepo.all(),
  async create(bookId: string, bookTitle: string, fileName: string, fileSizeKb: number, failAt?: IngestionStage) {
    await mockRequest(300);
    return ingestionRepo.create({ id: newId("ing"), bookId, bookTitle, fileName, fileSizeKb, stage: "upload", stageStatus: "running", progress: 0, stages: INGESTION_STAGES.map((stage, i) => ({ stage, status: i === 0 ? "running" : "pending", startedAt: i === 0 ? nowIso() : undefined })), logs: [{ at: nowIso(), level: "info", message: `Upload started: ${fileName}` }], failAt, chunkCount: 0, pagesProcessed: 0, createdAt: nowIso(), updatedAt: nowIso() });
  },
  /** Advances one stage (called on an interval by the UI). Stops at failures and at review. */
  async step(id: string) {
    const job = await ingestionRepo.get(id);
    if (job.stageStatus !== "running") return job;
    const i = INGESTION_STAGES.indexOf(job.stage);
    const stages = [...job.stages];
    if (job.failAt === job.stage) {
      stages[i] = { ...stages[i], status: "failed", finishedAt: nowIso(), message: "Simulated failure — see logs" };
      return ingestionRepo.update(id, { stages, stageStatus: "failed", logs: [...job.logs, { at: nowIso(), level: "error", message: `${job.stage} failed (simulated)` }] });
    }
    stages[i] = { ...stages[i], status: "succeeded", finishedAt: nowIso() };
    const next = INGESTION_STAGES[i + 1];
    if (!next) return ingestionRepo.update(id, { stages, stageStatus: "succeeded", progress: 100, logs: [...job.logs, { at: nowIso(), level: "info", message: "Published" }] });
    const ni = i + 1;
    const waiting = next === "review";
    stages[ni] = { ...stages[ni], status: waiting ? "waiting_review" : "running", startedAt: nowIso() };
    const messages: Partial<Record<IngestionStage, string>> = { validate: "File type and size validated", extract: "Text layer extracted", ocr: "OCR completed for scanned pages", map_chapters: "Chapters mapped to curriculum", chunk: "Created semantic chunks", embed: "Embeddings generated (mock)", index: "Indexed into vector store (mock)", quality_check: "Quality checks passed", review: "Waiting for reviewer approval", publish: "Publishing" };
    return ingestionRepo.update(id, {
      stages,
      stage: next,
      stageStatus: waiting ? "waiting_review" : "running",
      progress: Math.round((ni / INGESTION_STAGES.length) * 100),
      pagesProcessed: Math.min(96, job.pagesProcessed + 16),
      chunkCount: next === "embed" || next === "index" ? 412 : job.chunkCount,
      logs: [...job.logs, { at: nowIso(), level: "info", message: messages[next] ?? next }],
    });
  },
  async retry(id: string) {
    const job = await ingestionRepo.get(id);
    const i = INGESTION_STAGES.indexOf(job.stage);
    const stages = job.stages.map((s, j) => (j === i ? { ...s, status: "running" as const, message: undefined, startedAt: nowIso() } : s));
    return ingestionRepo.update(id, { stages, stageStatus: "running", failAt: undefined, logs: [...job.logs, { at: nowIso(), level: "info", message: `Retry ${job.stage}` }] });
  },
  async approveReview(id: string) {
    const job = await ingestionRepo.get(id);
    const i = INGESTION_STAGES.indexOf("review");
    const stages = job.stages.map((s, j) => (j === i ? { ...s, status: "succeeded" as const, finishedAt: nowIso() } : j === i + 1 ? { ...s, status: "running" as const, startedAt: nowIso() } : s));
    await booksRepo.update(job.bookId, { status: "published" }).catch(() => undefined);
    return ingestionRepo.update(id, { stages, stage: "publish", stageStatus: "running", logs: [...job.logs, { at: nowIso(), level: "info", message: "Reviewer approved" }] });
  },
  async reindex(id: string) {
    const job = await ingestionRepo.get(id);
    const from = INGESTION_STAGES.indexOf("chunk");
    const stages = job.stages.map((s, j) => (j === from ? { ...s, status: "running" as const, startedAt: nowIso() } : j > from ? { ...s, status: "pending" as const, startedAt: undefined, finishedAt: undefined } : s));
    return ingestionRepo.update(id, { stages, stage: "chunk", stageStatus: "running", progress: Math.round((from / INGESTION_STAGES.length) * 100), logs: [...job.logs, { at: nowIso(), level: "info", message: "Reindex requested" }] });
  },
};

// ---------------------------------------------------------------- Knowledge base & AI settings

const seedCollections = (): KbCollection[] => [
  ...subjects.filter((s) => s.levelCode === "SSC").slice(0, 8).map((s, i) => ({ id: `kc-${s.id}`, name: `${s.name.bn} — পাঠ্যবই`, kind: "subject" as const, subjectId: s.id, documentCount: 1 + (i % 3), chunkCount: 300 + i * 47, status: (i === 3 ? "stale" : i === 6 ? "indexing" : "ready") as KbCollection["status"], updatedAt: daysFromNow(-i) })),
  { id: "kc-cv-2012r", name: "শিক্ষাক্রম ২০১২ (সংশোধিত)", kind: "curriculum", curriculumVersionId: "cv-2012r", documentCount: 24, chunkCount: 5210, status: "ready", updatedAt: daysFromNow(-2) },
  { id: "kc-board", name: "বোর্ড-ধাঁচ নমুনা প্রশ্ন", kind: "document", documentCount: 1600, chunkCount: 9800, status: "failed", updatedAt: daysFromNow(-1) },
];
export const kbCollectionsRepo = createMockRepository<KbCollection>({ collection: "kbCollections", seed: seedCollections, timestamps: false });

const seedPrompts = (): PromptTemplate[] => [
  { id: "pt-simple", name: "সহজ ব্যাখ্যা (Simple)", mode: "simple", version: 3, status: "active", body: "You are a patient SSC/HSC tutor. Explain {{topic}} in simple Bangla for class {{grade}}. Use one everyday Bangladeshi example. Cite sources as [n]. If unsure, say so.", history: [{ version: 2, body: "You are a tutor. Explain {{topic}} simply.", at: daysFromNow(-30), by: "তানজিলা রহমান", note: "Added citation rule" }, { version: 1, body: "Explain {{topic}}.", at: daysFromNow(-60), by: "তানজিলা রহমান", note: "Initial" }], createdAt: SEED_EPOCH, updatedAt: daysFromNow(-10) },
  { id: "pt-socratic", name: "সক্রেটিক", mode: "socratic", version: 2, status: "active", body: "Do not give the final answer. Ask one guiding question at a time about {{topic}}, then wait.", history: [{ version: 1, body: "Ask questions about {{topic}}.", at: daysFromNow(-40), by: "নুসরাত জাহান", note: "Initial" }], createdAt: SEED_EPOCH, updatedAt: daysFromNow(-20) },
  { id: "pt-board", name: "বোর্ড পরীক্ষার উত্তর", mode: "board", version: 1, status: "draft", body: "Write a board-exam style answer for {{question}} with the marks breakdown {{marks}}.", history: [], createdAt: SEED_EPOCH, updatedAt: daysFromNow(-3) },
];
export const promptsRepo = createMockRepository<PromptTemplate>({ collection: "promptTemplates", seed: seedPrompts, searchFields: ["name", "body"] });

const seedAiSettings = (): AiSettings => ({
  id: "ai-settings",
  models: [
    { id: "m-primary", label: "Primary tutor model (mock)", provider: "mock-provider-a", temperature: 0.3, maxTokens: 900, enabled: true },
    { id: "m-fast", label: "Fast model for hints (mock)", provider: "mock-provider-b", temperature: 0.5, maxTokens: 400, enabled: true },
    { id: "m-eval", label: "Evaluation model (mock)", provider: "mock-provider-a", temperature: 0, maxTokens: 1200, enabled: false },
  ],
  routing: [
    { id: "r1", condition: "mode == 'practice' || mode == 'revision'", modelId: "m-fast", priority: 1 },
    { id: "r2", condition: "default", modelId: "m-primary", priority: 9 },
  ],
  policy: { minConfidenceToAnswer: 0.45, requireCitationsForVerified: true, blockOutdatedCurriculum: false, maxAnswerWords: 350, ageAppropriateFilter: true, integrityMode: "remind" },
  modeSettings: Object.fromEntries(["simple", "socratic", "board", "revision", "stepwise", "deep", "practice", "oral", "formula", "english"].map((m) => [m, { enabled: true, maxTurns: 30, sourceRequired: m !== "english" }])),
  version: 4,
  history: [{ version: 3, at: daysFromNow(-12), by: "নুসরাত জাহান", note: "Lowered temperature", snapshot: "{\"temperature\":0.4}" }],
});
const AI_KEY = "aiSettings";

const seedAiLogs = (): AiLogEntry[] => {
  const r = rng("ailogs");
  const kinds: AiLogEntry["kind"][] = ["failed_retrieval", "low_confidence", "source_mismatch", "feedback_negative", "error"];
  const qs = ["ত্বরণের একক কী?", "মোলার ভর বের করার নিয়ম", "অ্যাকাউন্টিং সমীকরণ", "স্বরসন্ধির উদাহরণ", "present perfect vs past simple", "কোষ বিভাজন কত প্রকার", "নিউটনের তৃতীয় সূত্রের উদাহরণ", "লগারিদমের সূত্র"];
  return Array.from({ length: 24 }, (_, i) => {
    const kind = kinds[i % kinds.length];
    return { id: `ail-${i + 1}`, at: daysFromNow(-r.int(0, 14), r.int(8, 23)), kind, subjectId: r.pick(subjects).id, query: r.pick(qs), detail: { failed_retrieval: "No passage above relevance threshold 0.35", low_confidence: "Confidence 0.38 < policy 0.45", source_mismatch: "Answer contradicts cited page", feedback_negative: "Student marked answer as unhelpful", error: "Upstream timeout (mock)" }[kind], status: (["open", "investigating", "resolved"] as const)[i % 3], tokens: r.int(200, 1400) };
  });
};
export const aiLogsRepo = createMockRepository<AiLogEntry>({ collection: "aiLogs", seed: seedAiLogs, timestamps: false, searchFields: ["query", "detail"], defaultSort: { sortBy: "at", sortOrder: "desc" } });

const seedEvals = (): EvalDataset[] => [
  { id: "ev-phy", name: "SSC পদার্থবিজ্ঞান — ১২০টি প্রশ্ন", subjectId: "ssc-physics", size: 120, lastRunAt: daysFromNow(-3), accuracy: 0.86, groundedRate: 0.91, runs: [{ at: daysFromNow(-30), accuracy: 0.79, groundedRate: 0.84, promptVersion: 2 }, { at: daysFromNow(-3), accuracy: 0.86, groundedRate: 0.91, promptVersion: 3 }] },
  { id: "ev-chem", name: "SSC রসায়ন — ৮০টি প্রশ্ন", subjectId: "ssc-chemistry", size: 80, lastRunAt: daysFromNow(-9), accuracy: 0.74, groundedRate: 0.82, runs: [{ at: daysFromNow(-9), accuracy: 0.74, groundedRate: 0.82, promptVersion: 3 }] },
  { id: "ev-safety", name: "নিরাপত্তা ও একাডেমিক সততা — ৫০টি প্রম্পট", size: 50, runs: [] },
];
export const evalsRepo = createMockRepository<EvalDataset>({ collection: "evalDatasets", seed: seedEvals, timestamps: false });

export const kbService = {
  collections: () => kbCollectionsRepo.all(),
  passages: () => passagesRepo.all(),
  async reindexCollection(id: string) {
    await mockRequest(400);
    return kbCollectionsRepo.update(id, { status: "indexing", updatedAt: nowIso() });
  },
  async finishIndexing(id: string) {
    return kbCollectionsRepo.update(id, { status: "ready", updatedAt: nowIso() });
  },
  /** Retrieval preview: the same keyword retriever the mock tutor uses. */
  async simulateQuery(query: string, subjectId?: string) {
    await mockRequest(300);
    const passages = await passagesRepo.raw();
    const ctx: TutorContext = { levelCode: "SSC", grade: 10, subjectId, curriculumVersionId: "cv-2012r", language: "bn", mode: "simple" };
    return retrieve(query, ctx, passages).slice(0, 6);
  },
  aiSettings: () => getDocument<AiSettings>(AI_KEY, seedAiSettings),
  async saveAiSettings(next: AiSettings, by: string, note: string) {
    await mockRequest(300);
    const prev = await getDocument<AiSettings>(AI_KEY, seedAiSettings);
    const saved: AiSettings = { ...next, version: prev.version + 1, history: [{ version: prev.version, at: nowIso(), by, note, snapshot: JSON.stringify({ models: prev.models, policy: prev.policy, routing: prev.routing }) }, ...prev.history].slice(0, 20) };
    await saveDocument(AI_KEY, saved);
    return saved;
  },
  async rollbackAiSettings(version: number, by: string) {
    const cur = await getDocument<AiSettings>(AI_KEY, seedAiSettings);
    const h = cur.history.find((x) => x.version === version);
    if (!h) return cur;
    const snap = JSON.parse(h.snapshot) as Partial<AiSettings>;
    return kbService.saveAiSettings({ ...cur, ...snap }, by, `Rollback to v${version}`);
  },
  prompts: () => promptsRepo.all(),
  async savePrompt(p: PromptTemplate, by: string, note: string, activate: boolean) {
    await mockRequest(300);
    const prev = await promptsRepo.find(p.id);
    if (!prev) return promptsRepo.create({ ...p, version: 1, history: [], status: activate ? "active" : "draft", createdAt: nowIso(), updatedAt: nowIso() });
    return promptsRepo.update(p.id, { body: p.body, name: p.name, version: prev.version + 1, status: activate ? "active" : prev.status, history: [{ version: prev.version, body: prev.body, at: nowIso(), by, note }, ...prev.history] });
  },
  async rollbackPrompt(id: string, version: number, by: string) {
    const p = await promptsRepo.get(id);
    const h = p.history.find((x) => x.version === version);
    if (!h) return p;
    return kbService.savePrompt({ ...p, body: h.body }, by, `Rollback to v${version}`, true);
  },
  logs: () => aiLogsRepo.all(),
  updateLog: (id: string, status: AiLogEntry["status"]) => aiLogsRepo.update(id, { status }),
  evals: () => evalsRepo.all(),
  async runEval(id: string, promptVersion: number) {
    await mockRequest(1800);
    const e = await evalsRepo.get(id);
    const r = rng(`${id}-${promptVersion}-${e.runs.length}`);
    const run = { at: nowIso(), accuracy: Math.round((0.72 + r.next() * 0.2) * 100) / 100, groundedRate: Math.round((0.8 + r.next() * 0.15) * 100) / 100, promptVersion };
    return evalsRepo.update(id, { runs: [...e.runs, run], lastRunAt: run.at, accuracy: run.accuracy, groundedRate: run.groundedRate });
  },
};

// ---------------------------------------------------------------- Moderation, security, sessions, keys, config

function seedModeration(): ModerationCase[] {
  const r = rng("moderation");
  const kinds: ModerationCase["kind"][] = ["user_report", "ai_response", "content_error", "ocr_error", "sensitive_content", "institution_paper"];
  const samples: Record<ModerationCase["kind"], [string, string]> = {
    user_report: ["প্রশ্নের উত্তর ভুল", "MCQ-তে সঠিক উত্তর 'খ' হওয়া উচিত"],
    ai_response: ["AI উত্তরে ভুল একক", "ত্বরণের একক m/s লিখেছে"],
    content_error: ["অধ্যায়ের বিবরণে টাইপো", "‘ভরবেগ’ বানান ভুল"],
    ocr_error: ["ছবি থেকে লেখা ভুল পড়া", "x² কে x2 পড়েছে"],
    sensitive_content: ["অনুপযুক্ত ভাষা (শিক্ষার্থী বার্তা)", "AI টিউটরে অশালীন শব্দ — ফিল্টার করা হয়েছে"],
    institution_paper: ["কপিরাইট উদ্বেগ", "প্রকাশকের প্রশ্নপত্র আপলোড হয়েছে বলে অভিযোগ"],
  };
  return Array.from({ length: 18 }, (_, i) => {
    const kind = kinds[i % kinds.length];
    return { id: `mc-${i + 1}`, kind, severity: (["low", "medium", "high", "critical"] as const)[(i * 3) % 4], status: (["open", "open", "in_review", "resolved", "dismissed"] as const)[i % 5], reporter: r.pick(["রাফি আহমেদ", "নাবিলা আহমেদ", "স্বয়ংক্রিয় ফিল্টার", "শিক্ষক (ডেমো)"]), subject: samples[kind][0], excerpt: samples[kind][1], reason: samples[kind][0], assignee: i % 3 ? "সাকিব হোসেন" : undefined, refHref: kind === "ai_response" ? "/admin/knowledge-base" : undefined, createdAt: daysFromNow(-r.int(0, 10)), updatedAt: daysFromNow(-r.int(0, 3)) };
  });
}
export const moderationRepo = createMockRepository<ModerationCase>({ collection: "moderationCases", seed: seedModeration, searchFields: ["subject", "excerpt", "reporter"], defaultSort: { sortBy: "createdAt", sortOrder: "desc" } });

const seedAlerts = (): SecurityAlert[] => [
  { id: "sa-1", at: daysFromNow(0, 7), severity: "warning", title: "একই IP থেকে ১২টি ব্যর্থ লগইন", detail: "10.0.4.22 — ১৫ মিনিটে ১২টি ব্যর্থ চেষ্টা (ডেমো)", acknowledged: false },
  { id: "sa-2", at: daysFromNow(-1, 22), severity: "critical", title: "অ্যাডমিন অ্যাকাউন্টে নতুন ডিভাইস", detail: "super@shikkha.ai — নতুন ব্রাউজার থেকে লগইন (ডেমো)", acknowledged: false },
  { id: "sa-3", at: daysFromNow(-3, 10), severity: "info", title: "API কী ৯০ দিনে রোটেট হয়নি", detail: "mock-provider-b staging key", acknowledged: true },
];
export const alertsRepo = createMockRepository<SecurityAlert>({ collection: "securityAlerts", seed: seedAlerts, timestamps: false, defaultSort: { sortBy: "at", sortOrder: "desc" } });

const seedSessions = (): SessionRecord[] => {
  const r = rng("sessions");
  const people: [string, string, UserRole][] = [["u-sadmin-1", "সিস্টেম সুপার অ্যাডমিন", "super_admin"], ["u-padmin-1", "নুসরাত জাহান", "platform_admin"], ["u-cm-1", "তানজিলা রহমান", "content_manager"], ["u-support-1", "সাকিব হোসেন", "support"], ["u-teacher-1", "নাসরিন সুলতানা", "teacher"], ["u-student-1", "রাফি আহমেদ", "student"]];
  return people.flatMap(([userId, userName, role], i) => [{ id: `ss-${i}-a`, userId, userName, role, device: r.pick(["Chrome · Windows", "Firefox · Ubuntu", "Safari · macOS", "ShikkhaAI Android"]), location: r.pick(["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "সিলেট"]) + " (আনুমানিক)", startedAt: daysFromNow(-r.int(0, 5), 9), lastSeenAt: daysFromNow(0, r.int(8, 12)), current: i === 0 }]);
};
export const sessionsAdminRepo = createMockRepository<SessionRecord>({ collection: "sessionRecords", seed: seedSessions, timestamps: false });

const seedKeys = (): ApiKeySetting[] => [
  { id: "k-1", name: "LLM provider (production)", provider: "mock-provider-a", maskedValue: "sk-•••• •••• 7Q2X", environment: "production", lastRotatedAt: daysFromNow(-40) },
  { id: "k-2", name: "LLM provider (staging)", provider: "mock-provider-b", maskedValue: "sk-•••• •••• K9PL", environment: "staging", lastRotatedAt: daysFromNow(-120) },
  { id: "k-3", name: "SMS gateway", provider: "mock-sms", maskedValue: "••••-••••-31AF", environment: "production", lastRotatedAt: daysFromNow(-15) },
  { id: "k-4", name: "Payment gateway (sandbox)", provider: "mock-pay", maskedValue: "pk_test_•••• 88ZZ", environment: "development", lastRotatedAt: daysFromNow(-7) },
];
export const apiKeysRepo = createMockRepository<ApiKeySetting>({ collection: "apiKeys", seed: seedKeys, timestamps: false });

const seedConfig = (): SystemConfig => ({ id: "system", maintenanceMode: false, signupsEnabled: true, defaultLocale: "bn", maxUploadMb: 10, featureFlags: { voiceTutor: true, photoSolver: true, handwritingEvaluation: true, leaderboards: true, institutionPapersPublic: true, betaLabs: false } });

export const securityService = {
  alerts: () => alertsRepo.all(),
  acknowledge: (id: string) => alertsRepo.update(id, { acknowledged: true }),
  sessions: () => sessionsAdminRepo.all(),
  revokeSession: (id: string) => sessionsAdminRepo.remove(id),
  keys: () => apiKeysRepo.all(),
  /** Rotation only changes the masked placeholder — no real secret ever exists in the frontend. */
  async rotateKey(id: string) {
    await mockRequest(600);
    const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
    const k = await apiKeysRepo.get(id);
    return apiKeysRepo.update(id, { maskedValue: k.maskedValue.replace(/[A-Z0-9]{4}$/, tail), lastRotatedAt: nowIso() });
  },
  config: () => getDocument<SystemConfig>("systemConfig", seedConfig),
  async saveConfig(c: SystemConfig) {
    await mockRequest(300);
    await saveDocument("systemConfig", c);
    return c;
  },
  async permissionMatrix(): Promise<PermissionMatrix> {
    return getDocument<{ id: string; matrix: PermissionMatrix }>("permissionMatrix", () => ({ id: "matrix", matrix: ROLE_PERMISSIONS })).then((d) => d.matrix);
  },
  async savePermissionMatrix(matrix: PermissionMatrix) {
    await mockRequest(300);
    await saveDocument("permissionMatrix", { id: "matrix", matrix });
    return matrix;
  },
  togglePermission(matrix: PermissionMatrix, role: UserRole, p: Permission): PermissionMatrix {
    const has = matrix[role].includes(p);
    return { ...matrix, [role]: has ? matrix[role].filter((x) => x !== p) : [...matrix[role], p] };
  },
};

// ---------------------------------------------------------------- Analytics series (deterministic mock BI)

export function analyticsSeries(days: number) {
  const r = rng(`bi-${days}`);
  const out: { date: string; dau: number; signups: number; paid: number; aiRequests: number; voiceMinutes: number; revenue: number; studyMinutes: number; reports: number }[] = [];
  let dau = 8200;
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 864e5);
    const weekend = date.getDay() === 5;
    dau = Math.max(5000, Math.round(dau * (1 + (r.next() - 0.45) * 0.04)));
    out.push({
      date: date.toISOString().slice(0, 10),
      dau: weekend ? Math.round(dau * 0.82) : dau,
      signups: r.int(120, 340),
      paid: r.int(18, 60),
      aiRequests: Math.round(dau * (3.1 + r.next())),
      voiceMinutes: Math.round(dau * (0.4 + r.next() * 0.2)),
      revenue: r.int(18_000, 42_000),
      studyMinutes: r.int(48, 74),
      reports: r.int(2, 18),
    });
  }
  return out;
}
