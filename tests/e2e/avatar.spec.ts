import { expect, test } from "@playwright/test";
import { DEMO, heading, login, logout } from "./helpers";

test.describe("per-book avatar teacher", () => {
  test("student asks the book's avatar; in-book answer cites a page, out-of-book question is declined", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, DEMO.student);
    await page.goto("/student/avatar-tutor");
    await heading(page, "বইয়ের শিক্ষক");
    await page.goto("/student/avatar-tutor/book-ssc-physics-bn");
    await page.getByRole("button", { name: /ক্লাস শুরু করো/ }).click();
    await expect(page).toHaveURL(/session=/);

    const box = page.getByPlaceholder(/এই বই থেকে প্রশ্ন লেখো/);
    await box.fill("ত্বরণ কাকে বলে?");
    await box.press("Enter");
    await expect(page.locator("a[href*='/student/library/book-ssc-physics-bn?page=']").first()).toBeVisible({ timeout: 60_000 });

    await box.fill("বাংলাদেশের রাজধানীর নাম কী?");
    await box.press("Enter");
    await expect(page.getByText("বইয়ের বাইরে").first()).toBeVisible({ timeout: 60_000 });
  });

  test("admin upload creates the book's avatar; editor opens from the books table link", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, DEMO.platformAdmin);
    await page.goto("/admin/books");
    await heading(page, /বই/);
    await page.getByRole("button", { name: /PDF আপলোড/ }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "e2e-avatar-book.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
    await page.getByRole("button", { name: /আপলোড ও ইনজেস্ট/ }).click();
    await expect(page.getByText(/অ্যাভাটার শিক্ষক তৈরি হয়েছে/).first()).toBeVisible({ timeout: 30_000 });

    await page.goto("/admin/book-avatars");
    await expect(page.getByRole("cell", { name: "e2e-avatar-book" })).toBeVisible({ timeout: 60_000 });
    await page.goto("/admin/book-avatars?book=book-ssc-physics-bn");
    await expect(page.getByRole("tab", { name: "পরীক্ষা চ্যাট" })).toBeVisible({ timeout: 60_000 });
    await logout(page);
  });
});
