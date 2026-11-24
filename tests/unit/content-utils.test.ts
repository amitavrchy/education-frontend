import { describe, expect, it } from "vitest";
import { bestMatch, plainText, similarity } from "@/components/admin/admin-shared";
import { questionsRepo, filterQuestions } from "@/services/question.service";

describe("duplicate detection helpers", () => {
  it("scores identical text 1 and unrelated text near 0", () => {
    expect(similarity("নিউটনের দ্বিতীয় সূত্র কী?", "নিউটনের দ্বিতীয় সূত্র কী?")).toBe(1);
    expect(similarity("নিউটনের দ্বিতীয় সূত্র কী?", "অ্যাকাউন্টিং সমীকরণ লেখো")).toBeLessThan(0.2);
  });
  it("finds the best match in a pool", () => {
    const pool = ["What is inertia?", "Define momentum and its unit", "State Newton's first law"];
    const m = bestMatch("Define momentum and write its unit", pool, (s) => s);
    expect(m?.item).toBe("Define momentum and its unit");
    expect(m!.score).toBeGreaterThan(0.6);
  });
  it("turns LaTeX/markdown into readable text", () => {
    expect(plainText("**গাড়ি** $5\\,\\text{s}$-এ $20\\,\\text{m s}^{-1}$")).toBe("গাড়ি 5 s-এ 20 m s^-1");
    expect(plainText("$\\frac{a}{b} \\times c$")).toBe("a/b × c");
  });
});

describe("question bank search & filters", () => {
  it("only returns published questions matching every filter", async () => {
    const all = await questionsRepo.raw();
    expect(all.length).toBeGreaterThan(100);
    const physicsMcq = filterQuestions(all, { subjectId: "ssc-physics", types: ["mcq"] });
    expect(physicsMcq.length).toBeGreaterThan(0);
    expect(physicsMcq.every((q) => q.subjectId === "ssc-physics" && q.type === "mcq" && q.status === "published")).toBe(true);
    const hard = filterQuestions(all, { subjectId: "ssc-physics", difficulty: ["hard"] });
    expect(hard.every((q) => q.difficulty === "hard")).toBe(true);
    const draft = { ...all[0], id: "draft-x", status: "draft" as const };
    expect(filterQuestions([draft], {})).toHaveLength(0);
  });
  it("searches the stem text", async () => {
    const all = await questionsRepo.raw();
    const word = "বল";
    const hits = filterQuestions(all, {}, word);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThan(filterQuestions(all, {}).length);
  });
});
