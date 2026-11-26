import type { PlanCode, PlanLimits, UsageMeter } from "@/contracts";
import { getDocument, saveDocument } from "@/lib/mock-db";
import { dateKey } from "@/mock-data/utils";
import { invalid } from "./core/mock-runtime";
import { usersRepo } from "./auth.service";

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  free: { aiMessagesPerDay: 20, voiceMinutesPerMonth: 15, photoSolvesPerDay: 5, offlineDownloads: 3, members: 1, handwritingEvaluationsPerMonth: 3 },
  pro: { aiMessagesPerDay: 300, voiceMinutesPerMonth: 300, photoSolvesPerDay: 60, offlineDownloads: 50, members: 1, handwritingEvaluationsPerMonth: 40 },
  family: { aiMessagesPerDay: 300, voiceMinutesPerMonth: 300, photoSolvesPerDay: 60, offlineDownloads: 50, members: 4, handwritingEvaluationsPerMonth: 40 },
};

export type UsageKind = "ai" | "voice" | "photo" | "handwriting";
const key = (userId: string) => `usage:${userId}`;

async function load(userId: string): Promise<UsageMeter> {
  const today = dateKey(0);
  const doc = await getDocument<UsageMeter>(key(userId), () => ({ id: userId, aiMessagesToday: userId === "u-student-1" ? 14 : 0, voiceMinutesThisMonth: userId === "u-student-1" ? 42 : 0, photoSolvesToday: userId === "u-student-1" ? 3 : 0, handwritingThisMonth: userId === "u-student-1" ? 5 : 0, date: today }));
  if (doc.date !== today) {
    const sameMonth = doc.date.slice(0, 7) === today.slice(0, 7);
    return { ...doc, aiMessagesToday: 0, photoSolvesToday: 0, voiceMinutesThisMonth: sameMonth ? doc.voiceMinutesThisMonth : 0, handwritingThisMonth: sameMonth ? doc.handwritingThisMonth : 0, date: today };
  }
  return doc;
}

export const usageService = {
  async get(userId: string) {
    const meter = await load(userId);
    const plan = ((await usersRepo.find(userId))?.planCode ?? "free") as PlanCode;
    return { meter, plan, limits: PLAN_LIMITS[plan] ?? PLAN_LIMITS.free };
  },
  /** Throws QUOTA_EXCEEDED when the plan limit is reached; otherwise increments. */
  async consume(userId: string, kind: UsageKind, amount = 1) {
    const { meter, limits } = await usageService.get(userId);
    const map = { ai: ["aiMessagesToday", "aiMessagesPerDay"], voice: ["voiceMinutesThisMonth", "voiceMinutesPerMonth"], photo: ["photoSolvesToday", "photoSolvesPerDay"], handwriting: ["handwritingThisMonth", "handwritingEvaluationsPerMonth"] } as const;
    const [field, limit] = map[kind];
    if (meter[field] + amount > limits[limit]) invalid("QUOTA_EXCEEDED");
    await saveDocument(key(userId), { ...meter, [field]: meter[field] + amount });
  },
};
