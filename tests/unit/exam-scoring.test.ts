import { describe, expect, it } from "vitest";
import type { Question } from "@/contracts";
import { gradeFor, scoreAttempt } from "@/services/exam.service";
import { gradeObjective, isAnswered } from "@/services/question.service";

const base = { levelCode: "SSC", subjectId: "s", chapterId: "c", answer: "", explanation: "", difficulty: "easy", source: { kind: "synthetic", label: "t" }, provenance: "synthetic_sample", verification: "verified", examRelevance: "high", frequency: 1, tags: [], status: "published", version: 1, createdAt: "", updatedAt: "", stem: "q" } as const;
const q = (over: Partial<Question>): Question => ({ ...base, id: "q", type: "mcq", marks: 1, ...over }) as Question;

const mcq = q({ id: "m1", type: "mcq", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionId: "b" });
const tf = q({ id: "t1", type: "true_false", correctBoolean: false });
const blank = q({ id: "f1", type: "fill_blank", blanks: [["নিউটন", "newton"]] });
const match = q({ id: "x1", type: "matching", matchingPairs: [{ left: "F", right: "ma" }, { left: "p", right: "mv" }] });
const num = q({ id: "n1", type: "numerical", numericAnswer: { value: 9.8, tolerance: 0.05 }, marks: 2 });
const written = q({ id: "w1", type: "short", marks: 2 });

describe("gradeObjective", () => {
  it("grades every objective type", () => {
    expect(gradeObjective(mcq, { optionId: "b" })).toBe(true);
    expect(gradeObjective(mcq, { optionId: "a" })).toBe(false);
    expect(gradeObjective(tf, { booleanValue: false })).toBe(true);
    expect(gradeObjective(blank, { blanks: [" Newton "] })).toBe(true);
    expect(gradeObjective(blank, { blanks: ["গ্যালিলিও"] })).toBe(false);
    expect(gradeObjective(match, { matches: { F: "ma", p: "mv" } })).toBe(true);
    expect(gradeObjective(match, { matches: { F: "mv", p: "ma" } })).toBe(false);
    expect(gradeObjective(num, { numeric: 9.84 })).toBe(true);
    expect(gradeObjective(num, { numeric: 10 })).toBe(false);
  });
  it("returns null for written answers (needs teacher/simulated grading)", () => {
    expect(gradeObjective(written, { text: "something" })).toBeNull();
  });
  it("detects unanswered questions", () => {
    expect(isAnswered(mcq, undefined)).toBe(false);
    expect(isAnswered(written, { text: "   " })).toBe(false);
    expect(isAnswered(num, { numeric: 0 })).toBe(true);
  });
});

describe("scoreAttempt", () => {
  const exam = { negativeMarking: 0.25, passPercent: 33, totalMarks: 6 };
  const questions = [mcq, tf, num, written];
  const attempt = { questionOrder: questions.map((x) => x.id), timePerQuestion: {}, startedAt: new Date(Date.now() - 60_000).toISOString(), answers: { m1: { optionId: "b" }, t1: { booleanValue: true }, w1: { text: "answer" } } };

  it("counts correct, incorrect, unanswered and pending review", () => {
    const r = scoreAttempt(exam, questions, attempt);
    expect(r.correct).toBe(1);
    expect(r.incorrect).toBe(1);
    expect(r.unanswered).toBe(1);
    expect(r.pendingReview + r.questions.filter((x) => x.status === "partial").length).toBeGreaterThanOrEqual(1);
    expect(r.containsSimulatedGrading).toBe(true);
  });

  it("applies negative marking and never goes below zero", () => {
    const wrongOnly = scoreAttempt({ ...exam, negativeMarking: 1 }, [mcq], { ...attempt, questionOrder: ["m1"], answers: { m1: { optionId: "a" } } });
    expect(wrongOnly.negativeDeducted).toBeGreaterThan(0);
    expect(wrongOnly.score).toBeGreaterThanOrEqual(0);
  });

  it("scales marks to the exam total", () => {
    const perfect = scoreAttempt({ negativeMarking: 0, passPercent: 33, totalMarks: 10 }, [mcq, tf], { ...attempt, questionOrder: ["m1", "t1"], answers: { m1: { optionId: "b" }, t1: { booleanValue: false } } });
    expect(perfect.score).toBe(10);
    expect(perfect.percent).toBe(100);
    expect(perfect.grade).toBe("A+");
    expect(perfect.passed).toBe(true);
  });
});

describe("gradeFor", () => {
  it.each([
    [95, "A+"],
    [80, "A+"],
    [72, "A"],
    [61, "A-"],
    [55, "B"],
    [45, "C"],
    [33, "D"],
    [10, "F"],
  ])("%i%% → %s", (p, g) => expect(gradeFor(p)).toBe(g));
});
