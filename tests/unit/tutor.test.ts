import { describe, expect, it } from "vitest";
import { CURRENT_VERSION_ID } from "@/mock-data/curriculum";
import { retrieve } from "@/services/ai/tutor-engine";
import { passagesRepo } from "@/services/kb.service";
import { defaultContext } from "@/services/tutor.service";

describe("tutor context & mock RAG retrieval", () => {
  it("undefined profile fields do not erase context defaults (regression)", () => {
    const ctx = defaultContext({ curriculumVersionId: undefined, grade: undefined, mode: "board" });
    expect(ctx.curriculumVersionId).toBe(CURRENT_VERSION_ID);
    expect(ctx.grade).toBe(10);
    expect(ctx.mode).toBe("board");
  });

  it("retrieves textbook passages for a physics question with the default context", async () => {
    const hits = retrieve("নিউটনের দ্বিতীয় সূত্র কী?", defaultContext({ curriculumVersionId: undefined }), await passagesRepo.raw());
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].p.subjectId).toBe("ssc-physics");
  });

  it("prefers passages from the selected chapter", async () => {
    const all = await passagesRepo.raw();
    const p = all.find((x) => x.subjectId === "ssc-chemistry")!;
    const hits = retrieve(p.keywords[0], defaultContext({ subjectId: p.subjectId, chapterId: p.chapterId }), all);
    expect(hits[0].p.chapterId).toBe(p.chapterId);
  });
});
