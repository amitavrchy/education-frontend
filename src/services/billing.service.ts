import type { Coupon, Payment, Plan, PlanCode, RefundRequest, Subscription } from "@/contracts";
import { userAccounts } from "@/mock-data/users";
import { bi, daysFromNow, rng, SEED_EPOCH } from "@/mock-data/utils";
import { usersRepo } from "./auth.service";
import { createMockRepository } from "./core/repository";
import { invalid, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { notificationService } from "./notification.service";
import { PLAN_LIMITS } from "./usage.service";

/**
 * Subscription & billing (§40). Every amount is MOCK/DEMO money; no payment provider is called.
 * Checkout outcomes are simulated: card numbers ending in 0002 fail, bKash/Nagad numbers ending
 * in 9 stay pending, everything else succeeds.
 */

export const seedPlans = (): Plan[] => [
  { id: "plan-free", code: "free", name: bi("ফ্রি", "Free"), description: bi("শুরু করার জন্য প্রয়োজনীয় সব", "Everything you need to get started"), priceMonthly: 0, priceYearly: 0, features: [bi("দৈনিক ২০টি AI প্রশ্ন", "20 AI questions a day"), bi("প্রশ্ন ব্যাংক ও অনুশীলন", "Question bank & practice"), bi("৩টি অফলাইন ডাউনলোড", "3 offline downloads")], limits: PLAN_LIMITS.free, trialDays: 0, active: true, highlighted: false, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "plan-pro", code: "pro", name: bi("স্টুডেন্ট প্রো", "Student Pro"), description: bi("পূর্ণ প্রস্তুতির জন্য সব ফিচার", "Every feature for full exam prep"), priceMonthly: 299, priceYearly: 2990, features: [bi("দৈনিক ৩০০টি AI প্রশ্ন", "300 AI questions a day"), bi("মাসে ৩০০ মিনিট ভয়েস টিউটর", "300 voice-tutor minutes a month"), bi("হাতের লেখা মূল্যায়ন", "Handwriting evaluation"), bi("৫০টি অফলাইন ডাউনলোড", "50 offline downloads")], limits: PLAN_LIMITS.pro, trialDays: 7, active: true, highlighted: true, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "plan-family", code: "family", name: bi("ফ্যামিলি", "Family"), description: bi("৪ জন শিক্ষার্থী + অভিভাবক ড্যাশবোর্ড", "4 students + guardian dashboard"), priceMonthly: 699, priceYearly: 6990, features: [bi("৪টি শিক্ষার্থী অ্যাকাউন্ট", "4 student accounts"), bi("প্রো-এর সব ফিচার", "All Pro features"), bi("অভিভাবক রিপোর্ট", "Guardian reports")], limits: PLAN_LIMITS.family, trialDays: 7, active: true, highlighted: false, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "plan-institution", code: "institution", name: bi("প্রতিষ্ঠান", "Institution"), description: bi("স্কুল ও কলেজের জন্য — প্রতি শিক্ষার্থী মূল্য", "For schools and colleges — priced per student"), priceMonthly: 79, priceYearly: 790, features: [bi("প্রতিষ্ঠান পোর্টাল", "Institution portal"), bi("শিক্ষক ও শ্রেণি ব্যবস্থাপনা", "Teacher & class management"), bi("বিশ্লেষণ ও রিপোর্ট", "Analytics & reports")], limits: PLAN_LIMITS.institution, trialDays: 30, active: true, highlighted: false, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
];

const PRICE: Record<PlanCode, { monthly: number; yearly: number }> = { free: { monthly: 0, yearly: 0 }, pro: { monthly: 299, yearly: 2990 }, family: { monthly: 699, yearly: 6990 }, institution: { monthly: 79, yearly: 790 } };
const METHODS: Payment["method"][] = ["bkash_mock", "nagad_mock", "card_mock", "bank_mock"];

function seedSubscriptions(): Subscription[] {
  const r = rng("subs");
  return userAccounts
    .filter((u) => u.planCode && u.planCode !== "free")
    .map((u, i) => {
      const plan = u.planCode as PlanCode;
      const cycle = r.bool(0.35) ? "yearly" : "monthly";
      const status = (["active", "active", "active", "active", "trialing", "past_due", "cancelled", "pending_payment"] as const)[i % 8];
      return {
        id: `sub-${u.id}`,
        userId: u.id,
        userName: u.name,
        planCode: plan,
        status: u.id === "u-student-1" || u.id === "u-parent-1" ? "active" : status,
        cycle: u.id === "u-student-1" ? "monthly" : cycle,
        startedAt: daysFromNow(-r.int(20, 300)),
        renewsAt: daysFromNow(r.int(3, 28)),
        trialEndsAt: status === "trialing" ? daysFromNow(r.int(1, 6)) : undefined,
        cancelAt: status === "cancelled" ? daysFromNow(r.int(1, 20)) : undefined,
        amount: PRICE[plan][cycle],
        createdAt: SEED_EPOCH,
        updatedAt: SEED_EPOCH,
      } satisfies Subscription;
    });
}

function seedPayments(): Payment[] {
  const r = rng("payments");
  const out: Payment[] = [];
  let n = 1000;
  for (const s of seedSubscriptions()) {
    const months = s.cycle === "yearly" ? 1 : r.int(2, 9);
    for (let m = 0; m < months; m++) {
      const fail = r.bool(0.08);
      out.push({
        id: `pay-${s.userId}-${m}`,
        userId: s.userId,
        userName: s.userName,
        subscriptionId: s.id,
        planCode: s.planCode,
        amount: s.amount,
        method: r.pick(METHODS),
        status: fail ? "failed" : m === 0 && s.status === "pending_payment" ? "pending" : r.bool(0.03) ? "refunded" : "success",
        invoiceNo: `INV-DEMO-${++n}`,
        createdAt: daysFromNow(-(m * 30 + r.int(0, 5)), 10),
        failureReason: fail ? r.pick(["অপর্যাপ্ত ব্যালান্স (ডেমো)", "OTP সময় শেষ (ডেমো)", "কার্ড প্রত্যাখ্যাত (ডেমো)"]) : undefined,
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const seedCoupons = (): Coupon[] => [
  { id: "cp-1", code: "SSC2027", description: "SSC ২০২৭ পরীক্ষার্থীদের জন্য ২০% ছাড় (ডেমো)", percentOff: 20, planCodes: ["pro", "family"], validUntil: daysFromNow(60), maxRedemptions: 500, redeemed: 132, active: true, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "cp-2", code: "WELCOME50", description: "প্রথম মাসে ৳৫০ ছাড় (ডেমো)", amountOff: 50, planCodes: ["pro"], validUntil: daysFromNow(15), maxRedemptions: 1000, redeemed: 871, active: true, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "cp-3", code: "SCHOOL30", description: "প্রতিষ্ঠানের জন্য ৩০% ছাড় (ডেমো)", percentOff: 30, planCodes: ["institution"], validUntil: daysFromNow(120), maxRedemptions: 50, redeemed: 9, active: true, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
  { id: "cp-4", code: "EID2026", description: "ঈদ অফার — মেয়াদোত্তীর্ণ (ডেমো)", percentOff: 25, planCodes: ["pro", "family"], validUntil: daysFromNow(-20), maxRedemptions: 300, redeemed: 300, active: false, createdAt: SEED_EPOCH, updatedAt: SEED_EPOCH },
];

const seedRefunds = (): RefundRequest[] =>
  seedPayments()
    .filter((p) => p.status === "success")
    .slice(3, 7)
    .map((p, i) => ({ id: `rf-${i + 1}`, paymentId: p.id, userId: p.userId, userName: p.userName, amount: p.amount, reason: ["ভুল প্ল্যান কিনেছি", "দুইবার চার্জ হয়েছে", "ফিচার কাজ করছে না", "পরীক্ষা শেষ"][i], status: (["requested", "requested", "approved", "rejected"] as const)[i], createdAt: daysFromNow(-i - 1), updatedAt: daysFromNow(-i) }));

export const plansRepo = createMockRepository<Plan>({ collection: "plans", seed: seedPlans, entity: "Plan", latency: 120 });
export const subscriptionsRepo = createMockRepository<Subscription>({ collection: "subscriptions", seed: seedSubscriptions, searchFields: ["userName", "planCode"], entity: "Subscription", defaultSort: { sortBy: "startedAt", sortOrder: "desc" } });
export const paymentsRepo = createMockRepository<Payment>({ collection: "payments", seed: seedPayments, searchFields: ["userName", "invoiceNo"], timestamps: false, entity: "Payment", defaultSort: { sortBy: "createdAt", sortOrder: "desc" } });
export const couponsRepo = createMockRepository<Coupon>({ collection: "coupons", seed: seedCoupons, searchFields: ["code", "description"], entity: "Coupon" });
export const refundsRepo = createMockRepository<RefundRequest>({ collection: "refunds", seed: seedRefunds, searchFields: ["userName", "reason"], entity: "Refund" });

export interface CheckoutInput {
  userId: string;
  userName: string;
  planCode: PlanCode;
  cycle: "monthly" | "yearly";
  method: Payment["method"];
  account: string;
  couponCode?: string;
  startTrial?: boolean;
}

export function priceWithCoupon(base: number, coupon?: Coupon | null) {
  if (!coupon) return { total: base, discount: 0 };
  const discount = coupon.percentOff ? Math.round((base * coupon.percentOff) / 100) : Math.min(base, coupon.amountOff ?? 0);
  return { total: Math.max(0, base - discount), discount };
}

export const billingService = {
  plans: () => plansRepo.all(),
  async mySubscription(userId: string) {
    await mockRequest(120);
    return (await subscriptionsRepo.raw()).find((s) => s.userId === userId && s.status !== "cancelled") ?? null;
  },
  myPayments: async (userId: string) => (await paymentsRepo.all()).filter((p) => p.userId === userId),
  async validateCoupon(code: string, planCode: PlanCode) {
    await mockRequest(300);
    const c = (await couponsRepo.raw()).find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!c || !c.active || new Date(c.validUntil).getTime() < Date.now()) invalid("COUPON_INVALID");
    if (!c.planCodes.includes(planCode)) invalid("COUPON_NOT_APPLICABLE");
    if (c.redeemed >= c.maxRedemptions) invalid("COUPON_EXHAUSTED");
    return c;
  },

  /** Checkout simulator: returns the payment (success / failed / pending) and updates the subscription. */
  async checkout(input: CheckoutInput) {
    await mockRequest(1400, { requiresNetwork: true });
    const plan = (await plansRepo.raw()).find((p) => p.code === input.planCode)!;
    const coupon = input.couponCode ? await billingService.validateCoupon(input.couponCode, input.planCode) : null;
    const base = input.cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
    const { total } = priceWithCoupon(base, coupon);
    const digits = input.account.replace(/\D/g, "");
    const status: Payment["status"] = input.startTrial ? "success" : input.method === "card_mock" && digits.endsWith("0002") ? "failed" : (input.method === "bkash_mock" || input.method === "nagad_mock") && digits.endsWith("9") ? "pending" : "success";
    const payment = await paymentsRepo.create({
      id: newId("pay"),
      userId: input.userId,
      userName: input.userName,
      planCode: input.planCode,
      amount: input.startTrial ? 0 : total,
      method: input.method,
      status,
      invoiceNo: `INV-DEMO-${Date.now().toString().slice(-6)}`,
      createdAt: nowIso(),
      failureReason: status === "failed" ? "কার্ড প্রত্যাখ্যাত (ডেমো টেস্ট কার্ড ...0002)" : undefined,
    });
    if (status !== "failed") {
      const existing = (await subscriptionsRepo.raw()).find((s) => s.userId === input.userId && s.status !== "cancelled");
      const patch: Partial<Subscription> = {
        planCode: input.planCode,
        cycle: input.cycle,
        amount: total,
        status: status === "pending" ? "pending_payment" : input.startTrial ? "trialing" : "active",
        renewsAt: daysFromNow(input.startTrial ? plan.trialDays : input.cycle === "yearly" ? 365 : 30),
        trialEndsAt: input.startTrial ? daysFromNow(plan.trialDays) : undefined,
        couponCode: coupon?.code,
        cancelAt: undefined,
      };
      if (existing) await subscriptionsRepo.update(existing.id, patch);
      else await subscriptionsRepo.create({ id: newId("sub"), userId: input.userId, userName: input.userName, startedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso(), ...(patch as Omit<Subscription, "id" | "userId" | "userName" | "startedAt" | "createdAt" | "updatedAt">) });
      if (status === "success") await usersRepo.update(input.userId, { planCode: input.planCode }).catch(() => undefined);
      if (coupon) await couponsRepo.update(coupon.id, { redeemed: coupon.redeemed + 1 });
    }
    await notificationService.push({
      portal: "student",
      type: "payment",
      title: status === "success" ? "পেমেন্ট সফল (ডেমো)" : status === "pending" ? "পেমেন্ট অপেক্ষমাণ (ডেমো)" : "পেমেন্ট ব্যর্থ (ডেমো)",
      body: `${plan.name.bn} · ৳${total} · ${payment.invoiceNo}`,
      href: "/student/subscription",
      priority: status === "failed" ? "high" : "normal",
    });
    return payment;
  },

  /** Confirms a pending mobile-wallet payment (simulates the gateway callback). */
  async confirmPending(paymentId: string) {
    await mockRequest(800);
    const p = await paymentsRepo.update(paymentId, { status: "success" });
    const sub = (await subscriptionsRepo.raw()).find((s) => s.userId === p.userId && s.status === "pending_payment");
    if (sub) await subscriptionsRepo.update(sub.id, { status: "active" });
    await usersRepo.update(p.userId, { planCode: p.planCode }).catch(() => undefined);
    return p;
  },

  async cancel(userId: string, reason: string) {
    await mockRequest(500);
    const sub = (await subscriptionsRepo.raw()).find((s) => s.userId === userId && s.status !== "cancelled");
    if (!sub) invalid("NO_SUBSCRIPTION");
    // Cancels at period end; the reason feeds churn analytics in a real backend.
    void reason;
    return subscriptionsRepo.update(sub.id, { cancelAt: sub.renewsAt });
  },
  async resume(userId: string) {
    await mockRequest(300);
    const sub = (await subscriptionsRepo.raw()).find((s) => s.userId === userId && s.status !== "cancelled");
    if (sub) return subscriptionsRepo.update(sub.id, { cancelAt: undefined });
  },
  async downgradeToFree(userId: string) {
    await mockRequest(500);
    const sub = (await subscriptionsRepo.raw()).find((s) => s.userId === userId && s.status !== "cancelled");
    if (sub) await subscriptionsRepo.update(sub.id, { status: "cancelled", cancelAt: nowIso() });
    await usersRepo.update(userId, { planCode: "free" }).catch(() => undefined);
  },
  async requestRefund(userId: string, userName: string, paymentId: string, reason: string) {
    await mockRequest(400);
    const p = await paymentsRepo.get(paymentId);
    if ((await refundsRepo.raw()).some((r) => r.paymentId === paymentId && r.status !== "rejected")) invalid("REFUND_EXISTS");
    return refundsRepo.create({ id: newId("rf"), paymentId, userId, userName, amount: p.amount, reason, status: "requested", createdAt: nowIso(), updatedAt: nowIso() });
  },
  myRefunds: async (userId: string) => (await refundsRepo.raw()).filter((r) => r.userId === userId),
};
