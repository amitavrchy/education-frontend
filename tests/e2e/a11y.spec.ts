import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEMO, login } from "./helpers";

/**
 * Automated WCAG 2.2 A/AA checks (axe-core) on representative pages of every portal (A11Y-05/06).
 * Serious and critical violations fail the test; minor/moderate ones are printed for triage.
 * This complements — but does not replace — a manual screen-reader pass.
 */
async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1500);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // Recharts/radix internals generate decorative SVG nodes; colour contrast is audited separately (design tokens).
    .exclude(".recharts-wrapper")
    .analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of results.violations)
    console.log(`[a11y ${label}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(blocking.map((v) => `${v.id} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

test.describe("accessibility (axe)", () => {
  for (const path of ["/", "/login", "/register", "/pricing", "/faq"]) {
    test(`public ${path}`, async ({ page }) => {
      await page.goto(path);
      await audit(page, path);
    });
  }

  test("student portal pages", async ({ page }) => {
    await login(page, DEMO.student);
    for (const path of ["/student/dashboard", "/student/questions", "/student/exams", "/student/ai-tutor", "/student/settings"]) {
      await page.goto(path);
      await audit(page, path);
    }
  });

  test("teacher, parent and admin home pages", async ({ page }) => {
    for (const [email, path] of [
      [DEMO.teacher, "/teacher/dashboard"],
      [DEMO.parent, "/parent/dashboard"],
      [DEMO.platformAdmin, "/admin/users"],
    ] as const) {
      await page.context().clearCookies();
      await page.goto("/");
      await page.evaluate(() => localStorage.removeItem("shikkhaai-auth"));
      await login(page, email);
      await page.goto(path);
      await audit(page, path);
    }
  });
});

test.describe("keyboard navigation", () => {
  test("skip link moves focus to main content", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/student/dashboard");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Tab");
    const skip = page.locator("a[href='#main']");
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("login form is fully operable by keyboard with visible focus", async ({ page }) => {
    await page.goto("/login");
    const email = page.locator('input[type="email"]');
    await email.focus();
    await page.keyboard.type(DEMO.student);
    // Tab through the sign-in method radios to the password field.
    const password = page.locator('input[type="password"]');
    for (let i = 0; i < 5 && !(await password.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    // Focus indicator is drawn (ring/outline) on the focused control.
    const ring = await page.locator('input[type="password"]').evaluate((el) => {
      const s = getComputedStyle(el);
      return s.boxShadow !== "none" || (s.outlineStyle !== "none" && s.outlineWidth !== "0px");
    });
    expect(ring).toBe(true);
    await page.keyboard.type("demo-password-1");
    await page.keyboard.press("Enter");
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
  });

  test("command palette opens with Ctrl+K and closes with Escape", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/student/dashboard");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 60_000 });
    await page.locator("#main").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.type("গতি");
    await expect(page.getByRole("option").first()).toBeVisible();
    await audit(page, "command palette");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("invalid form fields are announced", async ({ page }) => {
    await page.goto("/login");
    await page.locator('form button[type="submit"]').click();
    const invalid = page.locator('[aria-invalid="true"]');
    await expect(invalid.first()).toBeVisible();
    const described = await invalid.first().getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    await expect(page.locator(`#${described!.split(" ")[0]}`)).toHaveAttribute("role", "alert");
  });
});
