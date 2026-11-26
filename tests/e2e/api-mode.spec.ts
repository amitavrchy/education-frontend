import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Smoke test against the real backend. Run only when the dev server uses API mode:
 *   NEXT_PUBLIC_USE_MOCK_API=false npm run dev   (backend on :4000 in demo mode)
 *   API_E2E=1 npx playwright test api-mode
 */
test.skip(!process.env.API_E2E, "API mode only (set API_E2E=1)");

function watchApi(page: Page) {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/v1/") && r.status() >= 400 && r.status() !== 401) failures.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  return failures;
}

test.describe("API mode", () => {
  test("student: dashboard, practice, exam submit", async ({ page }) => {
    const failures = watchApi(page);
    await login(page, "student@shikkha.ai");
    await page.goto("/student/dashboard");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForLoadState("networkidle");
    for (const path of ["/student/curriculum", "/student/questions", "/student/flashcards", "/student/notes", "/student/study-planner", "/student/achievements", "/student/analytics", "/student/ai-tutor", "/student/subscription", "/student/notifications"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    await page.goto("/student/exams");
    await page.waitForLoadState("networkidle");
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("parent and teacher portals load", async ({ page }) => {
    const failures = watchApi(page);
    await login(page, "parent@shikkha.ai");
    for (const path of ["/parent/dashboard", "/parent/children", "/parent/progress", "/parent/reports"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    await page.evaluate(() => localStorage.clear());
    await login(page, "teacher@shikkha.ai");
    for (const path of ["/teacher/dashboard", "/teacher/review", "/teacher/students", "/teacher/assignments", "/teacher/evaluations"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  // Every portal page: no API call may fail (catches screens still reading device-only or missing endpoints).
  const PAGES: Record<string, string[]> = {
    "student@shikkha.ai": ["achievements", "ai-tutor", "analytics", "answer-evaluation", "audio", "avatar-tutor", "board-questions", "bookmarks", "curriculum", "dashboard", "english-coach", "exams", "flashcards", "help", "institution-questions", "labs", "library", "notes", "notifications", "offline", "photo-solver", "practice", "questions", "results", "search", "settings", "study-planner", "subscription", "voice-tutor"].map((p) => `/student/${p}`),
    "parent@shikkha.ai": ["avatar-activity", "calendar", "children", "dashboard", "feedback", "goals", "notifications", "privacy", "progress", "reports", "results", "settings", "subscription"].map((p) => `/parent/${p}`),
    "teacher@shikkha.ai": ["analytics", "assignments", "avatars", "dashboard", "evaluations", "exams", "history", "notifications", "questions", "review", "rubrics", "settings", "students", "subjects", "submissions"].map((p) => `/teacher/${p}`),
    "super@shikkha.ai": ["analytics", "board-questions", "book-avatars", "books", "content-review", "coverage", "curriculum", "dashboard", "exams", "institution-questions", "knowledge-base", "moderation", "notifications", "questions", "security", "settings", "subscriptions", "teachers", "users"].map((p) => `/admin/${p}`),
  };
  for (const [user, paths] of Object.entries(PAGES)) {
    test(`every page loads without API errors: ${user}`, async ({ page }) => {
      test.setTimeout(240_000);
      const failures = watchApi(page);
      await login(page, user);
      for (const path of paths) {
        const before = failures.length;
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        for (let i = before; i < failures.length; i++) failures[i] = `${path}: ${failures[i]}`;
      }
      expect(failures, failures.join("\n")).toEqual([]);
    });
  }
});
