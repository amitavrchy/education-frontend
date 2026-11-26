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
});
