import { CONTENT_TRANSITIONS, type Actor, type ContentStatus, type Question, type ReviewContentType, type ReviewItem, type Rubric } from "@/contracts";
import { questions as seedQuestions } from "@/mock-data/questions";
import { daysFromNow, rng, SEED_EPOCH } from "@/mock-data/utils";
import { createMockRepository } from "./core/repository";
import { forbidden, invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notificationService } from "./notification.service";
import { questionsRepo } from "./question.service";

/**
 * Editorial workflow (§28): draft → submitted → in_review → changes_requested → approved → published → archived.
 * Transitions are validated against CONTENT_TRANSITIONS and by role (reviewers approve, teachers submit).
 */

const TEACHER: Actor = { id: "u-teacher-1", name: "নাসরিন সুলতানা", role: "teacher" };
const REVIEWER: Actor = { id: "u-reviewer-1", name: "ড. মাহমুদ হাসান", role: "content_reviewer" };
const CM: Actor = { id: "u-cm-1", name: "তানজিলা রহমান", role: "content_manager" };

function seedReviews(): ReviewItem[] {
  const r = rng("reviews");
  const statuses: ContentStatus[] = ["submitted", "in_review", "in_review", "changes_requested", "approved", "submitted", "published", "draft", "in_review", "submitted", "approved", "archived"];
  const kinds: ReviewContentType[] = ["question", "question", "question", "ai_answer", "chapter", "board_paper", "institution_paper", "rubric", "question", "book", "question", "note"];
  const qs = seedQuestions.filter((q) => q.subjectId.startsWith("ssc")).slice(0, 30);
  return statuses.map((status, i) => {
    const q = qs[(i * 3) % qs.length];
    const kind = kinds[i];
    const title =
      kind === "question" ? `প্রশ্ন: ${q.stem.replace(/\*\*|\$/g, "").slice(0, 60)}` : kind === "ai_answer" ? "AI উত্তর যাচাই: ত্বরণের একক" : kind === "chapter" ? "অধ্যায় বিবরণ হালনাগাদ: রাসায়নিক বিক্রিয়া" : kind === "board_paper" ? "বোর্ড-ধাঁচ পত্র ২০২৪ (কৃত্রিম) — সমাধান যাচাই" : kind === "institution_paper" ? "প্রতিষ্ঠানের প্রশ্নপত্র: অর্ধবার্ষিক ২০২৬" : kind === "rubric" ? "রুব্রিক: সৃজনশীল প্রশ্ন (পদার্থবিজ্ঞান)" : kind === "book" ? "পাঠ্যবই পৃষ্ঠা সংশোধন: পৃষ্ঠা ৪২" : "নোট টেমপ্লেট: সূত্র শিট";
    const submitter = i % 3 === 0 ? CM : TEACHER;
    const history: ReviewItem["history"] = [{ at: daysFromNow(-r.int(5, 12)), from: null, to: "draft", by: submitter }];
    if (status !== "draft") history.push({ at: daysFromNow(-r.int(3, 5)), from: "draft", to: "submitted", by: submitter });
    if (["in_review", "changes_requested", "approved", "published", "archived"].includes(status)) history.push({ at: daysFromNow(-r.int(1, 3)), from: "submitted", to: "in_review", by: REVIEWER });
    if (status === "changes_requested") history.push({ at: daysFromNow(-1), from: "in_review", to: "changes_requested", by: REVIEWER, note: "উত্তরে একক নেই" });
    if (["approved", "published", "archived"].includes(status)) history.push({ at: daysFromNow(-1), from: "in_review", to: "approved", by: REVIEWER });
    if (["published", "archived"].includes(status)) history.push({ at: daysFromNow(0, 8), from: "approved", to: "published", by: CM });
    if (status === "archived") history.push({ at: daysFromNow(0, 9), from: "published", to: "archived", by: CM });
    return {
      id: `rv-${i + 1}`,
      contentType: kind,
      contentId: kind === "question" ? q.id : `${kind}-${i}`,
      title,
      subjectId: q.subjectId,
      status,
      priority: (["normal", "high", "normal", "urgent", "low", "normal"] as const)[i % 6],
      submittedBy: submitter,
      assignedTo: status === "draft" ? undefined : REVIEWER,
      dueAt: daysFromNow(r.int(-1, 6)),
      preview: kind === "question" ? `${q.stem}\n\n**উত্তর:** ${q.answer}\n\n**ব্যাখ্যা:** ${q.explanation}` : kind === "ai_answer" ? "**প্রশ্ন:** ত্বরণের একক কী?\n\n**AI উত্তর:** ত্বরণের একক m/s (মিটার প্রতি সেকেন্ড)।\n\n> শিক্ষার্থী রিপোর্ট করেছে: উত্তরটি ভুল মনে হচ্ছে।" : `${title}\n\nকৃত্রিম ডেমো কনটেন্ট — পর্যালোচনার জন্য নমুনা।`,
      comments: i % 2 ? [{ id: `c-${i}`, author: REVIEWER, text: "বানান ও একক মিলিয়ে নিন।", at: daysFromNow(-1) }] : [],
      suggestions: kind === "ai_answer" ? [{ id: `s-${i}`, field: "answer", from: "m/s", to: "m/s² (মিটার প্রতি বর্গসেকেন্ড)", by: REVIEWER, at: daysFromNow(-1), state: "open" }] : [],
      history,
      createdAt: history[0].at,
      updatedAt: history[history.length - 1].at,
    };
  });
}

const seedRubrics = (): Rubric[] => [
  { id: "rb-1", name: "সৃজনশীল প্রশ্ন — পদার্থবিজ্ঞান", subjectId: "ssc-physics", appliesTo: "creative", criteria: [{ criterion: "জ্ঞান (ক)", marks: 1, description: "সঠিক সংজ্ঞা" }, { criterion: "অনুধাবন (খ)", marks: 2, description: "কারণসহ ব্যাখ্যা" }, { criterion: "প্রয়োগ (গ)", marks: 3, description: "সূত্র ও হিসাব, একক" }, { criterion: "উচ্চতর দক্ষতা (ঘ)", marks: 4, description: "বিশ্লেষণ ও সিদ্ধান্ত" }], status: "published", owner: "ড. মাহমুদ হাসান", createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "rb-2", name: "বর্ণনামূলক উত্তর (সাধারণ)", appliesTo: "descriptive", criteria: [{ criterion: "বিষয়বস্তু", marks: 3, description: "মূল পয়েন্ট" }, { criterion: "উদাহরণ", marks: 1, description: "প্রাসঙ্গিক উদাহরণ" }, { criterion: "উপস্থাপনা", marks: 1, description: "গোছানো লেখা" }], status: "published", owner: "ড. মাহমুদ হাসান", createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "rb-3", name: "হাতের লেখা মূল্যায়ন — গণিত", subjectId: "ssc-math", appliesTo: "handwriting", criteria: [{ criterion: "পদ্ধতি", marks: 3, description: "সঠিক ধাপ" }, { criterion: "হিসাব", marks: 2, description: "নির্ভুল গণনা" }, { criterion: "যাচাই", marks: 1, description: "উত্তর যাচাই" }], status: "in_review", owner: "নাসরিন সুলতানা", createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "rb-4", name: "English essay", subjectId: "ssc-english-2", appliesTo: "essay", criteria: [{ criterion: "Content", marks: 4, description: "Relevant ideas" }, { criterion: "Organisation", marks: 3, description: "Intro, body, conclusion" }, { criterion: "Language", marks: 3, description: "Grammar & vocabulary" }], status: "draft", owner: "শারমিন আক্তার", createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
];

export const reviewItemsRepo = createMockRepository<ReviewItem>({ collection: "reviewItems", seed: seedReviews, searchFields: ["title", "preview"], defaultSort: { sortBy: "updatedAt", sortOrder: "desc" }, entity: "ReviewItem" });
export const rubricsRepo = createMockRepository<Rubric>({ collection: "rubrics", seed: seedRubrics, searchFields: ["name"], entity: "Rubric" });

/** Which transitions a role may perform. Reviewers/managers decide; authors submit/withdraw. */
export function allowedTransitions(item: Pick<ReviewItem, "status">, role: string): ContentStatus[] {
  const base = CONTENT_TRANSITIONS[item.status];
  const reviewer = ["content_reviewer", "content_manager", "platform_admin", "super_admin"].includes(role);
  const publisher = ["content_manager", "platform_admin", "super_admin"].includes(role);
  return base.filter((to) => {
    if (to === "published" || to === "archived") return publisher;
    if (to === "in_review" || to === "approved" || (to === "changes_requested" && item.status !== "approved")) return reviewer;
    if (to === "changes_requested") return reviewer;
    return true; // submitted / draft: authors
  });
}

export const reviewService = {
  list: () => reviewItemsRepo.all(),
  get: (id: string) => reviewItemsRepo.get(id),
  async transition(id: string, to: ContentStatus, actor: Actor, note?: string) {
    await mockRequest(300);
    const item = await reviewItemsRepo.get(id);
    if (!CONTENT_TRANSITIONS[item.status].includes(to)) invalid("INVALID_TRANSITION");
    if (!allowedTransitions(item, actor.role).includes(to)) forbidden();
    if (to === "changes_requested" && !note?.trim()) invalid("NOTE_REQUIRED");
    const updated = await reviewItemsRepo.update(id, { status: to, assignedTo: to === "in_review" ? actor : item.assignedTo, history: [...item.history, { at: nowIso(), from: item.status, to, by: actor, note }] });
    if (item.contentType === "question" && (to === "published" || to === "archived")) await questionsRepo.update(item.contentId, { status: to }).catch(() => undefined);
    if (to === "changes_requested" || to === "approved" || to === "published") {
      await notificationService.push({ portal: item.submittedBy.role === "teacher" ? "teacher" : "admin", type: "content_correction", title: to === "changes_requested" ? "পরিবর্তনের অনুরোধ" : to === "approved" ? "কনটেন্ট অনুমোদিত" : "কনটেন্ট প্রকাশিত", body: item.title, href: item.submittedBy.role === "teacher" ? "/teacher/history" : "/admin/content-review", priority: to === "changes_requested" ? "high" : "normal" });
    }
    return updated;
  },
  async comment(id: string, actor: Actor, text: string) {
    const item = await reviewItemsRepo.get(id);
    return reviewItemsRepo.update(id, { comments: [...item.comments, { id: newId("c"), author: actor, text, at: nowIso() }] });
  },
  async suggest(id: string, actor: Actor, field: string, from: string, to: string) {
    const item = await reviewItemsRepo.get(id);
    return reviewItemsRepo.update(id, { suggestions: [...item.suggestions, { id: newId("s"), field, from, to, by: actor, at: nowIso(), state: "open" }] });
  },
  async resolveSuggestion(id: string, suggestionId: string, accept: boolean) {
    const item = await reviewItemsRepo.get(id);
    const s = item.suggestions.find((x) => x.id === suggestionId);
    let preview = item.preview;
    if (accept && s && s.from) preview = preview.split(s.from).join(s.to);
    return reviewItemsRepo.update(id, { preview, suggestions: item.suggestions.map((x) => (x.id === suggestionId ? { ...x, state: accept ? "accepted" : "rejected" } : x)) });
  },
  /** Teacher authoring: creates/updates a question as a draft and its review item. */
  async saveQuestion(actor: Actor, q: Question, submit: boolean) {
    await mockRequest(400);
    const exists = await questionsRepo.find(q.id);
    const saved = exists ? await questionsRepo.update(q.id, { ...q, status: submit ? "submitted" : "draft", version: exists.version + 1, versions: [...(exists.versions ?? []), { version: exists.version, at: nowIso(), by: actor.name, summary: "সম্পাদনা" }] }) : await questionsRepo.create({ ...q, status: submit ? "submitted" : "draft" });
    const existingItem = (await reviewItemsRepo.raw()).find((r) => r.contentType === "question" && r.contentId === saved.id && r.status !== "published" && r.status !== "archived");
    const status: ContentStatus = submit ? "submitted" : "draft";
    const preview = `${saved.stem}\n\n**উত্তর:** ${saved.answer}\n\n**ব্যাখ্যা:** ${saved.explanation}`;
    if (existingItem) await reviewItemsRepo.update(existingItem.id, { status, preview, title: `প্রশ্ন: ${saved.stem.replace(/\*\*|\$/g, "").slice(0, 60)}`, history: [...existingItem.history, { at: nowIso(), from: existingItem.status, to: status, by: actor }] });
    else await reviewItemsRepo.create({ id: newId("rv"), contentType: "question", contentId: saved.id, title: `প্রশ্ন: ${saved.stem.replace(/\*\*|\$/g, "").slice(0, 60)}`, subjectId: saved.subjectId, status, priority: "normal", submittedBy: actor, preview, comments: [], suggestions: [], history: [{ at: nowIso(), from: null, to: status, by: actor }], createdAt: nowIso(), updatedAt: nowIso() });
    return saved;
  },
  rubrics: () => rubricsRepo.all(),
  saveRubric: (r: Rubric) => (r.createdAt ? rubricsRepo.update(r.id, r) : rubricsRepo.create({ ...r, createdAt: nowIso(), updatedAt: nowIso() })),
  removeRubric: (id: string) => rubricsRepo.remove(id),
};
