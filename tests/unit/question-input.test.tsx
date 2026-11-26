import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuestionInput } from "@/components/student/questions/question-input";
import type { AttemptAnswer, Question } from "@/contracts";
import { gradeObjective } from "@/services/question.service";

const base: Omit<Question, "id" | "type"> = {
  levelCode: "SSC",
  subjectId: "ssc-physics",
  chapterId: "ssc-physics-c2",
  stem: "stem",
  answer: "ans",
  explanation: "exp",
  marks: 1,
  difficulty: "easy",
  source: { kind: "synthetic", label: "test" },
  provenance: "synthetic_sample",
  verification: "verified",
  examRelevance: "high",
  frequency: 1,
  tags: [],
  status: "published",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function Harness({ q, reveal, initial }: { q: Question; reveal?: boolean; initial?: AttemptAnswer }) {
  const [v, setV] = useState<AttemptAnswer | undefined>(initial);
  return (
    <>
      <QuestionInput question={q} value={v} onChange={setV} reveal={reveal} allowUpload />
      <output data-testid="value">{JSON.stringify(v ?? {})}</output>
      <output data-testid="grade">{String(gradeObjective(q, v))}</output>
    </>
  );
}
const value = () => JSON.parse(screen.getByTestId("value").textContent ?? "{}");
const grade = () => screen.getByTestId("grade").textContent;

describe("QuestionInput", () => {
  const mcq: Question = { ...base, id: "m", type: "mcq", options: [{ id: "a", text: "one" }, { id: "b", text: "two" }, { id: "c", text: "three" }, { id: "d", text: "four" }], correctOptionId: "b" };

  it("MCQ: radio semantics, selection and grading", async () => {
    render(<Harness q={mcq} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    await userEvent.click(radios[1]);
    expect(radios[1].getAttribute("aria-checked")).toBe("true");
    expect(value().optionId).toBe("b");
    expect(grade()).toBe("true");
  });

  it("MCQ reveal marks the correct and wrong options", () => {
    render(<Harness q={mcq} reveal initial={{ optionId: "a" }} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0].className).toMatch(/destructive/);
    expect(radios[1].className).toMatch(/success/);
  });

  it("true/false", async () => {
    render(<Harness q={{ ...base, id: "t", type: "true_false", correctBoolean: false }} />);
    await userEvent.click(screen.getByRole("radio", { name: /মিথ্যা|False/ }));
    expect(value().booleanValue).toBe(false);
    expect(grade()).toBe("true");
  });

  it("fill in the blanks accepts any listed answer, case-insensitively", async () => {
    render(<Harness q={{ ...base, id: "f", type: "fill_blank", blanks: [["Newton", "N"], ["kg"]] }} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "newton");
    await userEvent.type(inputs[1], "KG");
    expect(grade()).toBe("true");
  });

  it("matching uses a select per item", () => {
    render(<Harness q={{ ...base, id: "x", type: "matching", matchingPairs: [{ left: "F", right: "N" }, { left: "m", right: "kg" }] }} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "N" } });
    expect(grade()).toBe("false");
    fireEvent.change(selects[1], { target: { value: "kg" } });
    expect(grade()).toBe("true");
  });

  it("numerical answers respect the tolerance", async () => {
    render(<Harness q={{ ...base, id: "n", type: "numerical", numericAnswer: { value: 4, unit: "m/s", tolerance: 0.05 } }} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "4.03");
    expect(grade()).toBe("true");
    await userEvent.clear(input);
    await userEvent.type(input, "4.2");
    expect(grade()).toBe("false");
    expect(screen.getByText("m/s")).toBeTruthy();
  });

  it("written answers count words and accept handwritten uploads", async () => {
    render(<Harness q={{ ...base, id: "w", type: "creative", marks: 10 }} />);
    await userEvent.type(screen.getByRole("textbox"), "force equals mass times acceleration");
    expect(screen.getByText(/(5|৫) (শব্দ|words)/)).toBeTruthy();
    const file = new File(["x"], "page1.jpg", { type: "image/jpeg" });
    const upload = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(upload, file);
    expect(value().uploadNames).toEqual(["page1.jpg"]);
    expect(grade()).toBe("null");
  });
});
