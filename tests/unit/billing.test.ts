import { beforeEach, describe, expect, it } from "vitest";
import { resetMockDb } from "@/lib/mock-db";
import { billingService, priceWithCoupon, subscriptionsRepo } from "@/services/billing.service";

beforeEach(async () => {
  await resetMockDb();
});

describe("pricing & coupons", () => {
  it("applies percent and fixed discounts without going negative", () => {
    expect(priceWithCoupon(300, { percentOff: 20 } as never)).toEqual({ total: 240, discount: 60 });
    expect(priceWithCoupon(30, { amountOff: 50 } as never)).toEqual({ total: 0, discount: 30 });
    expect(priceWithCoupon(300, null)).toEqual({ total: 300, discount: 0 });
  });

  it("validates coupon state and plan applicability", async () => {
    await expect(billingService.validateCoupon("ssc2027", "pro")).resolves.toMatchObject({ code: "SSC2027" });
    await expect(billingService.validateCoupon("FAMILY30", "pro")).rejects.toThrow(/COUPON_NOT_APPLICABLE/);
    await expect(billingService.validateCoupon("EID2026", "pro")).rejects.toThrow(/COUPON_INVALID/);
    await expect(billingService.validateCoupon("NOPE", "pro")).rejects.toThrow(/COUPON_INVALID/);
  });
});

describe("checkout simulator", () => {
  const input = { userId: "u-test", userName: "Test", planCode: "pro" as const, cycle: "monthly" as const, account: "01700000000" };

  it("successful payment creates an active subscription (entitlements change)", async () => {
    const p = await billingService.checkout({ ...input, method: "bkash_mock" });
    expect(p.status).toBe("success");
    const sub = await billingService.mySubscription("u-test");
    expect(sub).toMatchObject({ planCode: "pro", status: "active" });
  });

  it("test card ending 0002 fails and does not activate", async () => {
    const p = await billingService.checkout({ ...input, method: "card_mock", account: "4242424242420002" });
    expect(p.status).toBe("failed");
    expect(p.failureReason).toBeTruthy();
    const subs = (await subscriptionsRepo.raw()).filter((s) => s.userId === "u-test" && s.status === "active");
    expect(subs).toHaveLength(0);
  });

  it("mobile wallet ending 9 is pending until confirmed", async () => {
    const p = await billingService.checkout({ ...input, method: "nagad_mock", account: "01700000009" });
    expect(p.status).toBe("pending");
    expect((await billingService.mySubscription("u-test"))?.status).toBe("pending_payment");
    await billingService.confirmPending(p.id);
    expect((await billingService.mySubscription("u-test"))?.status).toBe("active");
  });

  it("cancel keeps access until period end and can be resumed", async () => {
    await billingService.checkout({ ...input, method: "bkash_mock" });
    const cancelled = await billingService.cancel("u-test", "too expensive");
    expect(cancelled.cancelAt).toBeTruthy();
    await billingService.resume("u-test");
    expect((await billingService.mySubscription("u-test"))?.cancelAt).toBeUndefined();
  });
});
