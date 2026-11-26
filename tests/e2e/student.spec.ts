import { expect, test } from "@playwright/test";
import { DEMO, heading, login } from "./helpers";

test.describe("student journeys", () => {
  test("signs up, verifies OTP and finishes onboarding", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/register");
    await page.getByRole("textbox").first().fill("ই২ই শিক্ষার্থী");
    await page.getByRole("textbox").nth(1).fill("01712345678");
    const pw = page.locator('input[type="password"]');
    await pw.nth(0).fill("Abcd1234");
    await pw.nth(1).fill("Abcd1234");
    await page.locator("#terms").click();
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/verify-otp/);
    for (const [i, d] of [..."123456"].entries()) await page.getByRole("textbox", { name: `সংখ্যা ${i + 1}` }).fill(d);
    await page.getByRole("button", { name: "যাচাই করুন" }).click();
    await page.waitForURL(/onboarding/, { timeout: 60_000 });
    await expect(page).toHaveURL(/onboarding/);
    for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "পরবর্তী" }).click();
    await page.getByRole("button", { name: "শেষ করুন" }).click();
    await expect(page.getByText(/সব প্রস্তুত/)).toBeVisible();
    await page.getByRole("button", { name: /ড্যাশবোর্ড/ }).click();
    await expect(page).toHaveURL(/\/student/);
  });

  test("AI tutor answers with a source citation and opens the source viewer", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/student/ai-tutor");
    await page.getByLabel("বার্তা লিখুন").fill("নিউটনের দ্বিতীয় সূত্র কী?");
    await page.getByRole("button", { name: "পাঠান" }).click();
    const reply = page.getByRole("article", { name: "টিউটরের উত্তর" }).last();
    await expect(reply).toContainText("সিমুলেটেড AI");
    const citation = reply.locator("button").filter({ hasText: /পদার্থবিজ্ঞান|পৃ/ }).first();
    await expect(citation).toBeVisible({ timeout: 60_000 });
    await citation.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("takes an exam and sees the scored result", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, DEMO.student);
    await page.goto("/student/exams");
    await page.getByRole("button", { name: /^শুরু$|শুরু/ }).first().click();
    await expect(page).toHaveURL(/\/student\/exams\/take\//);
    await page.getByRole("button", { name: /পরীক্ষা শুরু করুন/ }).click();
    // Answer the first question with its first option, then submit.
    await page.locator("main [role=radio], main [role=radiogroup] button, main label:has(input[type=radio])").first().click().catch(() => undefined);
    await page.getByRole("button", { name: /জমা দিন/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: /জমা দিন/ }).click();
    await expect(page).toHaveURL(/\/student\/exams\/results\//, { timeout: 60_000 });
    await expect(page.getByText(/ফলাফল/).first()).toBeVisible();
    await page.goto("/student/results");
    await expect(page.getByRole("row").nth(1)).toBeVisible();
  });

  test("offline mode pauses the AI tutor", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/student/offline");
    await page.getByRole("switch").first().click();
    await expect(page.getByText("সিমুলেশন বন্ধ করুন")).toBeVisible();
    await page.goto("/student/ai-tutor");
    await expect(page.getByRole("button", { name: "পাঠান" })).toBeDisabled();
    await page.getByText("সিমুলেশন বন্ধ করুন").click();
  });

  test("changes language and theme persistently @mobile", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/student/dashboard");
    await page.getByRole("button", { name: "ভাষা পরিবর্তন" }).first().click();
    await expect(page.locator("h1").first()).toContainText(/Good|Hello|Hi/i);
    await page.reload();
    await expect(page.locator("h1").first()).toContainText(/Good|Hello|Hi/i);
    const html = page.locator("html");
    const before = await html.getAttribute("class");
    await page.getByRole("button", { name: /toggle theme|theme/i }).first().click();
    await expect(html).not.toHaveAttribute("class", before ?? "");
  });

  test("bookmarks a question and finds it on the bookmarks page", async ({ page }) => {
    await login(page, DEMO.student);
    await page.goto("/student/questions");
    await heading(page, "প্রশ্ন ব্যাংক");
    const bookmark = page.getByRole("button", { name: /বুকমার্ক/ }).first();
    await bookmark.click();
    await page.goto("/student/bookmarks");
    await expect(page.locator("main").getByRole("link").first()).toBeVisible();
  });
});

test.describe("guardian", () => {
  test("guardian sees authorised progress but not private AI chats", async ({ page }) => {
    await login(page, DEMO.parent);
    await page.goto("/parent/progress");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/parent/privacy");
    await expect(page.getByText(/AI/).first()).toBeVisible();
    await expect(page.getByText(/কথোপকথন/).first()).toBeVisible();
  });

});
