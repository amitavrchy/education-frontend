import type { Book, BookPage, ReadingState } from "@/contracts";
import { bookPage, books } from "@/mock-data/books";
import { createMockRepository, matchesSearch } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { registerSearchProvider, scoreText } from "./search.service";

export const booksRepo = createMockRepository<Book>({
  collection: "books",
  seed: () => books,
  searchFields: ["title.bn", "title.en", "publisher", "edition"],
  entity: "Book",
  idPrefix: "book",
  latency: 150,
});

const readingRepos = new Map<string, ReturnType<typeof createMockRepository<ReadingState>>>();
export function readingRepo(studentId: string) {
  let r = readingRepos.get(studentId);
  if (!r) {
    r = createMockRepository<ReadingState>({
      collection: `reading:${studentId}`,
      timestamps: false,
      defaultSort: { sortBy: "updatedAt", sortOrder: "desc" },
      seed: () =>
        studentId === "u-student-1"
          ? [
              {
                id: "book-ssc-physics-bn",
                bookId: "book-ssc-physics-bn",
                lastPage: 9,
                pagesRead: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                bookmarks: [7],
                highlights: [{ id: "hl-1", page: 7, text: "বেগ ও ত্বরণ", color: "yellow", createdAt: "2026-10-01T10:00:00.000Z" }],
                pageNotes: [{ id: "pn-1", page: 8, text: "ত্বরণের একক m/s² — পরীক্ষায় একক লিখতে ভুলবে না।", createdAt: "2026-10-01T10:05:00.000Z" }],
                zoom: 1,
                updatedAt: "2026-11-20T15:00:00.000Z",
              },
              { id: "book-ssc-chemistry-bn", bookId: "book-ssc-chemistry-bn", lastPage: 32, pagesRead: [31, 32], bookmarks: [], highlights: [], pageNotes: [], zoom: 1, updatedAt: "2026-11-18T15:00:00.000Z" },
            ]
          : [],
    });
    readingRepos.set(studentId, r);
  }
  return r;
}

const emptyState = (bookId: string): ReadingState => ({ id: bookId, bookId, lastPage: 1, pagesRead: [], bookmarks: [], highlights: [], pageNotes: [], zoom: 1, updatedAt: nowIso() });

export const libraryService = {
  async list() {
    return (await booksRepo.all()).filter((b) => b.status === "published");
  },
  get: (id: string) => booksRepo.get(id),
  async page(bookId: string, pageNumber: number): Promise<BookPage> {
    await mockRequest(120);
    const book = await booksRepo.get(bookId);
    return bookPage(book, Math.min(Math.max(1, pageNumber), book.pageCount));
  },
  async searchInBook(bookId: string, q: string) {
    await mockRequest(200);
    const book = await booksRepo.get(bookId);
    const hits: { page: number; heading?: string }[] = [];
    for (let p = 1; p <= book.pageCount; p++) {
      const page = bookPage(book, p);
      if (page.body.toLowerCase().includes(q.toLowerCase())) hits.push({ page: p, heading: page.heading });
    }
    return hits.slice(0, 30);
  },
  readingStates: (studentId: string) => readingRepo(studentId).all(),
  async readingState(studentId: string, bookId: string) {
    return (await readingRepo(studentId).find(bookId)) ?? emptyState(bookId);
  },
  async saveReading(studentId: string, bookId: string, patch: Partial<ReadingState>) {
    const repo = readingRepo(studentId);
    const current = (await repo.find(bookId)) ?? emptyState(bookId);
    const next = { ...current, ...patch, id: bookId, bookId, updatedAt: nowIso() };
    if (await repo.find(bookId)) return repo.update(bookId, next);
    return repo.create(next);
  },
  async visitPage(studentId: string, bookId: string, page: number) {
    const state = await libraryService.readingState(studentId, bookId);
    return libraryService.saveReading(studentId, bookId, { lastPage: page, pagesRead: [...new Set([...state.pagesRead, page])] });
  },
  async toggleBookmark(studentId: string, bookId: string, page: number) {
    const state = await libraryService.readingState(studentId, bookId);
    const bookmarks = state.bookmarks.includes(page) ? state.bookmarks.filter((p) => p !== page) : [...state.bookmarks, page].sort((a, b) => a - b);
    return libraryService.saveReading(studentId, bookId, { bookmarks });
  },
  async addHighlight(studentId: string, bookId: string, page: number, text: string, color: "yellow" | "green" | "blue" = "yellow") {
    const state = await libraryService.readingState(studentId, bookId);
    return libraryService.saveReading(studentId, bookId, { highlights: [...state.highlights, { id: newId("hl"), page, text, color, createdAt: nowIso() }] });
  },
  async removeHighlight(studentId: string, bookId: string, id: string) {
    const state = await libraryService.readingState(studentId, bookId);
    return libraryService.saveReading(studentId, bookId, { highlights: state.highlights.filter((h) => h.id !== id) });
  },
  async addPageNote(studentId: string, bookId: string, page: number, text: string) {
    const state = await libraryService.readingState(studentId, bookId);
    return libraryService.saveReading(studentId, bookId, { pageNotes: [...state.pageNotes, { id: newId("pn"), page, text, createdAt: nowIso() }] });
  },
  async removePageNote(studentId: string, bookId: string, id: string) {
    const state = await libraryService.readingState(studentId, bookId);
    return libraryService.saveReading(studentId, bookId, { pageNotes: state.pageNotes.filter((h) => h.id !== id) });
  },
  async booksForChapter(chapterId: string) {
    return (await booksRepo.raw()).filter((b) => b.status === "published" && b.chapters.some((c) => c.chapterId === chapterId));
  },
};

registerSearchProvider("book", async (q) =>
  (await booksRepo.raw())
    .filter((b) => b.status === "published" && matchesSearch(b, q, ["title.bn", "title.en"]))
    .map((b) => ({ kind: "book" as const, id: b.id, title: b.title, subtitle: { bn: `${b.edition} · ${b.language === "bn" ? "বাংলা ভার্সন" : "ইংলিশ ভার্সন"}`, en: `${b.publicationYear} · ${b.language === "bn" ? "Bangla version" : "English version"}` }, href: `/student/library/${b.id}`, score: scoreText(b.title.bn + b.title.en, q), subjectId: b.subjectId })),
);
