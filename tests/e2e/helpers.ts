import { expect, type Page } from "@playwright/test";

export const DEMO = {
  student: "student@shikkha.ai",
  parent: "parent@shikkha.ai",
  teacher: "teacher@shikkha.ai",
  reviewer: "reviewer@shikkha.ai",
  contentManager: "content@shikkha.ai",
  school: "school@shikkha.ai",
  support: "support@shikkha.ai",
  platformAdmin: "admin@shikkha.ai",
  superAdmin: "super@shikkha.ai",
} as const;

/** Signs in through the real login form (mock auth accepts any password). */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  const inputs = page.locator("form input:not([type=checkbox]):not([type=radio])");
  await inputs.nth(0).fill(email);
  await inputs.nth(1).fill("demo-password-1");
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
}

export async function heading(page: Page, text: string | RegExp) {
  await expect(page.locator("h1").first()).toContainText(text, { timeout: 60_000 });
}

/** Drops only the auth session; IndexedDB mock data stays (same browser profile). */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("shikkhaai-auth");
    sessionStorage.clear();
  });
}
