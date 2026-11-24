import { beforeEach, describe, expect, it } from "vitest";
import { resetMockDb } from "@/lib/mock-db";
import { levelFor, progressService } from "@/services/progress.service";

const STUDENT = "u-progress-test";

beforeEach(async () => {
  await resetMockDb();
});

describe("learning progress & adaptive mastery", () => {
  it("exam/practice results update topic mastery up for correct, down for wrong", async () => {
    const before = (await progressService.mastery(STUDENT)).find((m) => m.topicId === "ssc-physics-c2-t1");
    const start = before?.mastery ?? 50;
    await progressService.recordAttempts(STUDENT, [{ questionId: "q1", subjectId: "ssc-physics", chapterId: "ssc-physics-c2", topicId: "ssc-physics-c2-t1", correct: true, source: "exam" }]);
    const up = (await progressService.mastery(STUDENT)).find((m) => m.topicId === "ssc-physics-c2-t1")!;
    expect(up.mastery).toBeGreaterThan(start);
    await progressService.recordAttempts(STUDENT, [{ questionId: "q2", subjectId: "ssc-physics", chapterId: "ssc-physics-c2", topicId: "ssc-physics-c2-t1", correct: false, source: "exam" }]);
    const down = (await progressService.mastery(STUDENT)).find((m) => m.topicId === "ssc-physics-c2-t1")!;
    expect(down.mastery).toBeLessThan(up.mastery);
    expect(down.attempts).toBe(up.attempts + 1);
    expect(down.mistakes.concept_confusion).toBeGreaterThan(0);
  });

  it("logs study activity and awards XP", async () => {
    const g0 = await progressService.gamification(STUDENT);
    await progressService.recordAttempts(STUDENT, [{ questionId: "q3", subjectId: "ssc-math", chapterId: "ssc-math-c5", correct: true, source: "practice" }]);
    const g1 = await progressService.gamification(STUDENT);
    expect(g1.xp).toBeGreaterThan(g0.xp);
    const activity = await progressService.activity(STUDENT);
    expect(activity[0].kind).toBe("practice");
  });

  it("completing a chapter marks it 100% and records history", async () => {
    await progressService.setChapterStatus(STUDENT, "ssc-physics-c1", "ssc-physics", "start");
    await progressService.setChapterStatus(STUDENT, "ssc-physics-c1", "ssc-physics", "complete");
    const ch = (await progressService.chapterProgress(STUDENT)).find((c) => c.chapterId === "ssc-physics-c1")!;
    expect(ch.status).toBe("completed");
    expect(ch.percent).toBe(100);
    expect(ch.history.map((h) => h.action)).toEqual(expect.arrayContaining(["started", "completed"]));
  });

  it("levelFor splits XP into levels", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0 });
    expect(levelFor(2350)).toMatchObject({ level: 3, into: 350 });
  });
});
