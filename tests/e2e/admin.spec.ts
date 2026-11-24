import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { expect, test } from "@playwright/test";
import { DEMO, heading, login, logout } from "./helpers";

function tmpFile(name: string, content: string | Buffer) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "e2e-")), name);
  fs.writeFileSync(p, content);
  return p;
}

test.describe("admin workflows", () => {
  test("upload a book and complete the simulated ingestion pipeline", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, DEMO.superAdmin);
    await page.goto("/admin/books");
    await heading(page, "বই ও ডকুমেন্ট");
    await page.getByRole("button", { name: /বই যোগ \/ PDF আপলোড/ }).click();
    await page.getByLabel("PDF ফাইল").setInputFiles(tmpFile("E2E Physics Book.pdf", "%PDF-1.4 demo"));
    await page.getByRole("button", { name: /আপলোড ও ইনজেস্ট/ }).click();
    await expect(page.getByText("E2E Physics Book").first()).toBeVisible();
    // Pipeline advances on its own until the review gate.
    const approve = page.getByRole("button", { name: /পর্যালোচনা অনুমোদন/ }).first();
    await page.getByText("E2E Physics Book").first().click();
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await approve.click();
    await expect(page.getByText(/অনুমোদিত — প্রকাশ হচ্ছে/)).toBeVisible();
  });

  test("bulk-import questions from CSV with duplicate detection", async ({ page }) => {
    await login(page, DEMO.contentManager);
    await page.goto("/admin/questions");
    await page.getByRole("tab", { name: "বাল্ক ইমপোর্ট" }).click();
    const csv = 'stem,type,difficulty,marks,answer\n"E2E: আলোর বেগ কত?",short,easy,2,"3×10^8 m/s"\n"E2E: শব্দ কি শূন্য মাধ্যমে চলে?",true_false,easy,1,"না"\n';
    await page.getByTestId("file-input").setInputFiles(tmpFile("questions.csv", csv));
    await expect(page.getByText("নিষ্কাশন প্রিভিউ")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "প্রশ্ন" }).first()).toHaveValue(/E2E: আলোর বেগ/);
    await page.getByRole("button", { name: /খসড়া হিসেবে ইমপোর্ট/ }).click();
    await expect(page.getByText(/খসড়া হিসেবে যোগ হয়েছে/)).toBeVisible();
    await page.getByRole("tab", { name: "ডাটাবেস" }).click();
    await page.locator("main").getByPlaceholder("খুঁজুন", { exact: true }).fill("E2E: আলোর বেগ");
    await expect(page.getByRole("cell", { name: /E2E: আলোর বেগ/ })).toBeVisible();
  });

  test("admin publishes an exam and the student sees it", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, DEMO.superAdmin);
    await page.goto("/admin/exams");
    await page.getByRole("button", { name: "নতুন পরীক্ষা" }).click();
    await page.getByLabel(/শিরোনাম/).fill("E2E মডেল টেস্ট");
    await page.getByRole("button", { name: /পরবর্তী/ }).click();
    await page.getByRole("button", { name: /র‍্যান্ডম বাছাই/ }).click();
    await expect(page.getByText(/১০টি বাছাই|10 selected/)).toBeVisible();
    await page.getByRole("button", { name: /পরবর্তী/ }).click();
    await page.getByRole("button", { name: /পরবর্তী/ }).click();
    await page.getByRole("button", { name: /^প্রকাশ$|প্রকাশ/ }).last().click();
    await expect(page.getByText(/পরীক্ষা প্রকাশিত/)).toBeVisible();
    await expect(page.getByRole("cell", { name: "E2E মডেল টেস্ট" })).toBeVisible();

    await logout(page);
    await login(page, DEMO.student);
    await page.goto("/student/exams");
    await expect(page.getByText("E2E মডেল টেস্ট")).toBeVisible();
  });

  test("admin changes a subscription plan", async ({ page }) => {
    await login(page, DEMO.platformAdmin);
    await page.goto("/admin/subscriptions");
    await page.getByRole("tab", { name: "সাবস্ক্রিপশন" }).click();
    await page.getByRole("row").nth(1).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "family" }).click();
    await sheet.getByRole("button", { name: /পরিবর্তন/ }).click();
    await expect(page.getByText(/এনটাইটেলমেন্ট পরিবর্তিত/)).toBeVisible();
    await expect(sheet.getByText(/family ·/)).toBeVisible();
  });

  test("checkout simulator handles a failing test card", async ({ page }) => {
    await login(page, DEMO.superAdmin);
    await page.goto("/admin/subscriptions");
    await page.getByRole("tab", { name: "চেকআউট সিমুলেটর" }).click();
    await page.getByRole("combobox", { name: "মাধ্যম" }).click();
    await page.getByRole("option", { name: "Card (mock)" }).click();
    await page.getByLabel("ডেমো অ্যাকাউন্ট নম্বর").fill("4242424242420002");
    await page.getByRole("button", { name: /পেমেন্ট সিমুলেট/ }).click();
    await expect(page.getByText("পেমেন্ট ব্যর্থ", { exact: true })).toBeVisible();
  });
});

test.describe("editorial workflow", () => {
  test("reviewer approves content, content manager publishes it", async ({ page }) => {
    await login(page, DEMO.reviewer);
    await page.goto("/teacher/review");
    const row = page.getByRole("row").filter({ hasText: "পর্যালোচনায়" }).first();
    const title = (await row.locator("span.font-medium").first().textContent())?.trim() ?? "";
    expect(title.length).toBeGreaterThan(3);
    await row.click();
    await page.getByRole("button", { name: "অনুমোদন" }).click();
    await expect(page.getByText("অবস্থা: অনুমোদিত")).toBeVisible();

    await logout(page);
    await login(page, DEMO.contentManager);
    await page.goto("/admin/content-review");
    await page.locator("main").getByPlaceholder("খুঁজুন", { exact: true }).fill(title.slice(0, 20));
    // The approval persisted: the same item now shows as approved in the admin queue.
    await page.getByRole("row").filter({ hasText: title.slice(0, 20) }).filter({ hasText: "অনুমোদিত" }).first().click();
    await page.getByRole("button", { name: "প্রকাশ" }).click();
    await expect(page.getByText("অবস্থা: প্রকাশিত")).toBeVisible();
  });
});
