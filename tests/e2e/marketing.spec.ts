import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("homepage demos are interactive @mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("ব্যক্তিগত AI শিক্ষক");
    // Tutor demo: switching mode changes the simulated answer.
    await page.getByRole("radio", { name: "বোর্ড উত্তর" }).click();
    await expect(page.getByText("সংজ্ঞা:", { exact: false })).toBeVisible();
    // MCQ demo gives instant feedback.
    await page.getByRole("button", { name: "বেগ" }).click();
    await expect(page.getByText("বেগের মান ও দিক দুটোই আছে।")).toBeVisible();
    // Testimonials are labelled as demo content.
    await expect(page.getByText(/ডেমো কনটেন্ট/)).toBeVisible();
  });

  test("all marketing pages render", async ({ page }) => {
    for (const path of ["/features", "/pricing", "/for-parents", "/for-teachers", "/for-schools", "/for-colleges", "/faq", "/about", "/contact", "/help", "/terms", "/privacy", "/accessibility"]) {
      await page.goto(path);
      await expect(page.locator("h1").first(), path).toBeVisible();
    }
  });

  test("pricing toggles monthly/yearly from live plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("/ মাস").first()).toBeVisible();
    await page.getByRole("switch", { name: "বার্ষিক মূল্য দেখাও" }).click();
    await expect(page.getByText("/ বছর").first()).toBeVisible();
  });

  test("contact form validates and submits", async ({ page }) => {
    await page.goto("/contact?topic=institution");
    await page.getByRole("button", { name: "বার্তা পাঠান" }).click();
    await expect(page.getByText("সঠিক ইমেইল দিন")).toBeVisible();
    await page.getByLabel(/^নাম/).fill("Test User");
    await page.getByLabel(/^ইমেইল/).fill("test@example.com");
    await page.getByLabel(/^মোবাইল/).fill("12345");
    await page.getByLabel(/^বার্তা/).fill("We would like a demo for our school next week, please.");
    await page.getByRole("button", { name: "বার্তা পাঠান" }).click();
    await expect(page.getByText(/সঠিক বাংলাদেশি মোবাইল নম্বর/)).toBeVisible();
    await page.getByLabel(/^মোবাইল/).fill("01711000009");
    await page.getByRole("button", { name: "বার্তা পাঠান" }).click();
    await expect(page.getByRole("status")).toContainText("TKT-");
  });

  test("FAQ search filters questions", async ({ page }) => {
    await page.goto("/faq");
    await page.getByLabel("প্রশ্ন খুঁজুন").fill("বোর্ড");
    await expect(page.getByRole("button", { name: /বোর্ড প্রশ্নগুলো কি আসল/ })).toBeVisible();
    await page.getByLabel("প্রশ্ন খুঁজুন").fill("zzzz");
    await expect(page.getByText("কোনো মিল পাওয়া যায়নি")).toBeVisible();
  });
});
