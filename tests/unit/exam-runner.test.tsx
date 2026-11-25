import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExamRunner } from "@/components/student/exams/exam-runner";
import { demoUsers } from "@/mock-data/users";
import { examService } from "@/services/exam.service";
import { useAuthStore } from "@/stores/auth-store";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/student/exams/take/x", useSearchParams: () => new URLSearchParams() }));

const STUDENT = demoUsers.student.id;

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

async function newAttempt() {
  return examService.createAndStart(STUDENT, {
    kind: "chapter",
    subjectId: "ssc-physics",
    chapterIds: ["ssc-physics-c2"],
    topicIds: [],
    types: ["mcq"],
    count: 3,
    difficulty: "mixed",
    durationMinutes: 10,
    negativeMarking: 0,
    mode: "exam",
    randomize: false,
    reviewPolicy: "after_submit",
  });
}

describe("ExamRunner", () => {
  beforeEach(() => {
    router.replace.mockReset();
    useAuthStore.setState({ user: demoUsers.student, hydrated: true, expiresAt: new Date(Date.now() + 3600_000).toISOString() });
  });

  it("shows instructions, then runs the exam with keyboard answering, palette and mark-for-review", async () => {
    const attemptId = await newAttempt();
    wrap(<ExamRunner attemptId={attemptId} />);

    await userEvent.click(await screen.findByRole("button", { name: /পরীক্ষা শুরু করুন|Begin exam/ }));
    expect(screen.getByRole("timer")).toBeTruthy();
    const palette = screen.getByRole("complementary", { name: /প্যালেট|palette/i });
    expect(within(palette).getAllByRole("button")).toHaveLength(3);

    // "1" picks the first option, M marks for review, → moves on.
    await userEvent.keyboard("1");
    expect(screen.getAllByRole("radio")[0].getAttribute("aria-checked")).toBe("true");
    await userEvent.keyboard("m");
    expect(screen.getByRole("main").querySelector("button[aria-pressed='true']")?.textContent).toMatch(/চিহ্নিত|Marked/);
    expect(within(palette).getAllByRole("button")[0].getAttribute("aria-label")).toMatch(/চিহ্নিত|marked/);
    await userEvent.keyboard("{ArrowRight}");
    expect(within(palette).getAllByRole("button")[1].getAttribute("aria-current")).toBe("step");
    expect(within(palette).getAllByRole("button")[0].getAttribute("aria-label")).toMatch(/উত্তর দেওয়া|answered/);
  });

  it("autosaves answers so the attempt can be recovered", async () => {
    const attemptId = await newAttempt();
    wrap(<ExamRunner attemptId={attemptId} />);
    await userEvent.click(await screen.findByRole("button", { name: /পরীক্ষা শুরু করুন|Begin exam/ }));
    await userEvent.keyboard("2");
    await act(() => new Promise((r) => setTimeout(r, 900)));
    const saved = await examService.attempt(STUDENT, attemptId);
    expect(Object.keys(saved.answers)).toHaveLength(1);
  });

  it("confirms before submitting and opens the result", async () => {
    const attemptId = await newAttempt();
    wrap(<ExamRunner attemptId={attemptId} />);
    await userEvent.click(await screen.findByRole("button", { name: /পরীক্ষা শুরু করুন|Begin exam/ }));
    await userEvent.keyboard("1");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    const dialog = await screen.findByRole("dialog");
    // Summary tiles: answered / unanswered / marked.
    expect(within(dialog).getAllByText(/^[১1]$/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/^[২2]$/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole("button", { name: /জমা দিন|Submit/ }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/student/exams/results/${attemptId}`));
    const done = await examService.attempt(STUDENT, attemptId);
    expect(done.status).toBe("submitted");
    expect(done.result?.questions).toHaveLength(3);
  });
});
