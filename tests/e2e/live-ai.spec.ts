import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Live AI and manual payments against the real stack (backend + education-ai with Gemini).
 *   API_E2E=1 npx playwright test live-ai
 */
test.skip(!process.env.API_E2E, "API mode only (set API_E2E=1)");

const API = process.env.API_URL ?? "http://localhost:4000/api/v1";

async function token(email: string) {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: email, password: "demo-password-123" }) });
  return ((await r.json()) as { data: { accessToken: string } }).data.accessToken;
}

async function api<T>(method: string, path: string, tok: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: body ? JSON.stringify(body) : undefined });
  return ((await r.json()) as { data: T }).data;
}

function watchApi(page: Page) {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/v1/") && r.status() >= 400 && r.status() !== 401) failures.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  return failures;
}

test.describe("live AI", () => {
  test.setTimeout(240_000);

  test("photo solver reads a sample photo and solves it", async ({ page }) => {
    const failures = watchApi(page);
    await login(page, "student@shikkha.ai");
    await page.goto("/student/photo-solver");
    await page.locator("main button.overflow-hidden").first().click();
    await page.getByRole("button", { name: /লেখা শনাক্ত করো|Extract question/ }).click();
    const text = page.getByRole("textbox", { name: /শনাক্তকৃত লেখা|Extracted text/ });
    await expect(text).not.toHaveValue("", { timeout: 90_000 });
    await page.getByRole("button", { name: /সমাধান দেখাও|Get solution/ }).click();
    await expect(page.getByRole("button", { name: /সমাধান দেখাও|Get solution/ })).toHaveCount(0, { timeout: 90_000 });
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("English writing gets AI feedback", async ({ page }) => {
    const failures = watchApi(page);
    await login(page, "student@shikkha.ai");
    await page.goto("/student/english-coach");
    await page.getByRole("tab", { name: /লেখা|Writing/ }).click();
    await page.locator("textarea[lang=en]").fill(
      "My school are very big and beautiful. I goes there every day with my friends. We learns many things from our teachers. In the afternoon we plays football in the field. I loves my school very much because it help me to grow.",
    );
    await page.getByRole("button", { name: /ফিডব্যাক নাও|Get feedback/ }).click();
    await expect(page.getByText(/AI মূল্যায়ন|AI assessment/)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /গ্রামার|Grammar/ })).toBeVisible({ timeout: 90_000 });
    expect(failures, failures.join("\n")).toEqual([]);
  });
});

test.describe("book avatar voice", () => {
  test.setTimeout(240_000);

  test("the avatar speaks Bangla with server speech", async ({ page }) => {
    const failures = watchApi(page);
    // Record what the page asks the browser to play.
    await page.addInitScript(() => {
      const played: string[] = [];
      (window as unknown as { __played: string[] }).__played = played;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        played.push(this.src);
        return play.call(this).catch(() => undefined) as Promise<void>;
      };
    });
    await login(page, "student@shikkha.ai");
    await page.goto("/student/avatar-tutor/book-ssc-physics-bn");
    const speech = page.waitForResponse((r) => r.url().endsWith("/api/v1/speech") && r.request().method() === "POST", { timeout: 90_000 });
    await page.getByRole("button", { name: /ক্লাস শুরু করো|Start class/ }).click();
    const res = await speech;
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: { mediaType: string; data: string } };
    expect(body.data.mediaType).toBe("audio/wav");
    expect(Buffer.from(body.data.data, "base64").subarray(0, 4).toString()).toBe("RIFF");
    // The greeting's server audio is played (a blob: URL), not the device voice.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __played: string[] }).__played.some((u) => u.startsWith("blob:"))), { timeout: 15_000 }).toBe(true);
    expect(failures, failures.join("\n")).toEqual([]);
  });
});

test.describe("manual payment", () => {
  test.setTimeout(240_000);

  test("student submits a bKash transaction id, admin verifies it", async ({ browser }) => {
    const admin = await token("super@shikkha.ai");
    const before = await api<unknown>("GET", "/documents/paymentSettings", admin);
    await api("PUT", "/documents/paymentSettings", admin, { id: "payment", methods: [{ method: "bkash", number: "01700000000", accountType: "personal", enabled: true, instructions: "E2E TEST" }] });
    // A fresh student account so the demo student's plan and payments stay untouched.
    const phone = `0171${String(Date.now()).slice(-7)}`;
    const reg = await fetch(`${API}/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "E2E Payer", identifier: phone, channel: "phone", password: "abcd1234", role: "student" }) });
    const challengeId = ((await reg.json()) as { data: { challengeId: string } }).data.challengeId;
    const verified = await fetch(`${API}/auth/otp/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId, code: "123456" }) });
    const payer = ((await verified.json()) as { data: { session: { accessToken: string } } }).data.session.accessToken;
    await api("POST", "/auth/onboarded", payer);
    try {
      const student = await browser.newPage();
      const failures = watchApi(student);
      await student.goto("/login");
      await student.getByRole("radio", { name: /মোবাইল|Mobile/ }).click();
      const inputs = student.locator("form input:not([type=checkbox]):not([type=radio])");
      await inputs.nth(0).fill(phone);
      await inputs.nth(1).fill("abcd1234");
      await student.locator('form button[type="submit"]').click();
      await student.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
      await student.goto("/student/subscription");
      await student.getByRole("button", { name: /আপগ্রেড|Upgrade/ }).first().click();
      const trial = student.getByRole("checkbox");
      if (await trial.count()) await trial.first().uncheck();
      await expect(student.getByText("01700000000")).toBeVisible();
      await student.getByLabel(/যে নম্বর থেকে|Number you sent from/).fill("01811111111");
      const trx = `E2E${Date.now().toString(36).toUpperCase()}`;
      await student.getByLabel(/ট্রানজেকশন আইডি|Transaction ID/).fill(trx);
      await student.getByRole("button", { name: /যাচাইয়ের জন্য জমা দাও|Submit for verification/ }).click();
      await expect(student.getByText(/যাচাইয়ের জন্য জমা হয়েছে|Submitted for verification/)).toBeVisible({ timeout: 30_000 });
      expect(failures, failures.join("\n")).toEqual([]);

      const adminPage = await browser.newPage();
      await login(adminPage, "super@shikkha.ai");
      await adminPage.goto("/admin/subscriptions?tab=verify");
      const row = adminPage.locator("div.rounded-lg.border").filter({ hasText: trx });
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.getByRole("button", { name: /যাচাই করুন|Verify/ }).click();
      await expect(row).toHaveCount(0, { timeout: 30_000 });

      await student.reload();
      await expect(student.getByText(/যাচাইয়ের অপেক্ষায়|awaiting verification/)).toHaveCount(0);
    } finally {
      await api("PUT", "/documents/paymentSettings", admin, before ?? { id: "payment", methods: [] });
    }
  });
});
