/**
 * Loads every module that registers a search provider (side-effect imports), then exposes the
 * search service. UI should import search from here so global search always covers all content.
 */
import "./archive.service";
import "./flashcards.service";
import "./library.service";
import "./notes.service";
import "./question.service";
import "./tutor.service";
import { matchesSearch } from "./core/repository";
import { examsRepo } from "./exam.service";
import { registerSearchProvider, scoreText } from "./search.service";

registerSearchProvider("exam", async (q) =>
  (await examsRepo.raw())
    .filter((e) => (e.status === "published" || e.status === "scheduled") && !e.id.startsWith("ex-bp-") && matchesSearch(e, q, ["title"]))
    .slice(0, 10)
    .map((e) => ({ kind: "exam" as const, id: e.id, title: { bn: e.title, en: e.title }, subtitle: { bn: "মক পরীক্ষা", en: "Mock exam" }, href: "/student/exams", score: scoreText(e.title, q) - 2, subjectId: e.subjectId })),
);

export { searchService, type SearchHit, type SearchKind } from "./search.service";
