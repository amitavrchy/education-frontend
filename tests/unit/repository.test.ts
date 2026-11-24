import { beforeEach, describe, expect, it } from "vitest";
import { __resetMemoryForTests, resetMockDb } from "@/lib/mock-db";
import { createMockRepository, queryItems } from "@/services/core/repository";

interface Book {
  id: string;
  title: string;
  subject: string;
  pages: number;
  createdAt: string;
  updatedAt: string;
}
const seed = (): Book[] => Array.from({ length: 25 }, (_, i) => ({ id: `b${i + 1}`, title: i % 2 ? `Physics ${i + 1}` : `রসায়ন ${i + 1}`, subject: i % 2 ? "physics" : "chemistry", pages: 100 + i, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }));
const repo = () => createMockRepository<Book>({ collection: "test-books", seed, searchFields: ["title"], latency: 0 });

beforeEach(async () => {
  await resetMockDb();
});

describe("mock repository", () => {
  it("seeds lazily and paginates", async () => {
    const page = await repo().list({ page: 2, pageSize: 10 });
    expect(page.total).toBe(25);
    expect(page.items).toHaveLength(10);
    expect(page.items[0].id).toBe("b11");
  });

  it("filters, searches (Bangla and English) and sorts", async () => {
    const r = repo();
    expect((await r.list({ filters: { subject: "physics" }, pageSize: 100 })).total).toBe(12);
    expect((await r.list({ search: "রসায়ন", pageSize: 100 })).total).toBe(13);
    const sorted = await r.list({ sortBy: "pages", sortOrder: "desc", pageSize: 1 });
    expect(sorted.items[0].pages).toBe(124);
  });

  it("supports CRUD with timestamps and not-found errors", async () => {
    const r = repo();
    const created = await r.create({ title: "New book", subject: "math", pages: 5, createdAt: "", updatedAt: "" });
    expect(created.id).toMatch(/^tes-/);
    expect(created.createdAt).not.toBe("");
    const updated = await r.update(created.id, { pages: 9 });
    expect(updated.pages).toBe(9);
    await r.remove(created.id);
    await expect(r.get(created.id)).rejects.toMatchObject({ status: 404 });
  });

  it("bulk-updates and bulk-removes", async () => {
    const r = repo();
    await r.bulkUpdate(["b1", "b2"], { subject: "archived" });
    expect((await r.all({ subject: "archived" })).map((b) => b.id)).toEqual(["b1", "b2"]);
    await r.bulkRemove(["b1", "b2"]);
    expect(await r.find("b1")).toBeUndefined();
  });

  it("persists to IndexedDB across a simulated reload", async () => {
    await repo().update("b3", { title: "Persisted" });
    __resetMemoryForTests(); // drop in-memory cache, as on page reload
    expect((await repo().get("b3")).title).toBe("Persisted");
  });

  it("queryItems clamps out-of-range pages to the last page", () => {
    const out = queryItems(seed(), { page: 99, pageSize: 10 });
    expect(out.page).toBe(3);
    expect(out.items).toHaveLength(5);
    expect(queryItems([], { page: 2 }).items).toEqual([]);
  });
});
