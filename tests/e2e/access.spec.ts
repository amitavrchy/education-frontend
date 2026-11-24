import { expect, test } from "@playwright/test";
import { DEMO, heading, login } from "./helpers";

test.describe("role-based access", () => {
  test("unauthenticated users are sent to login from a portal", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a student cannot open the admin dashboard", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/admin/dashboard");
    // Either redirected back to the student portal or shown the access-denied state.
    await expect(page.getByText("প্রবেশাধিকার নেই").or(page.getByRole("heading", { name: /শুভ/ }))).toBeVisible();
    await expect(page.getByRole("heading", { name: "অ্যাডমিন ড্যাশবোর্ড" })).toHaveCount(0);
  });

  test("support staff see access denied on content authoring pages", async ({ page }) => {
    await login(page, DEMO.support);
    await page.goto("/admin/users");
    await heading(page, "ব্যবহারকারী ব্যবস্থাপনা");
    await page.goto("/admin/curriculum");
    await expect(page.getByText("প্রবেশাধিকার নেই")).toBeVisible();
    await expect(page.getByRole("heading", { name: "কারিকুলাম ব্যবস্থাপনা" })).toHaveCount(0);
  });

  test("each admin role lands on its portal home", async ({ page }) => {
    await login(page, DEMO.contentManager);
    await expect(page).toHaveURL(/\/admin\//);
    await heading(page, "অ্যাডমিন ড্যাশবোর্ড");
  });
});
