import type { OfflineItem } from "@/contracts";
import { daysFromNow } from "@/mock-data/utils";
import { createMockRepository } from "./core/repository";
import { invalid, isEffectivelyOffline, mockRequest, newId, nowIso } from "./core/mock-runtime";
import { usageService } from "./usage.service";

/**
 * Offline learning (§26). Downloads are simulated: nothing is actually cached by a service worker,
 * but the queue, storage accounting, versioning and sync-conflict flows behave like the real thing.
 */
export const STORAGE_LIMIT_MB = 500;

function seed(studentId: string): OfflineItem[] {
  if (studentId !== "u-student-1") return [];
  return [
    { id: "off-1", kind: "book", refId: "book-ssc-physics-bn", title: "পদার্থবিজ্ঞান (পাঠ্যবই)", sizeMb: 48, version: "2026.1", latestVersion: "2026.2", status: "outdated", progress: 100, downloadedAt: daysFromNow(-30), sync: "synced" },
    { id: "off-2", kind: "notes", refId: "note-3", title: "বিস্তারিত নোট: মোল ধারণা", sizeMb: 0.4, version: "3", latestVersion: "3", status: "downloaded", progress: 100, downloadedAt: daysFromNow(-3), sync: "pending" },
    { id: "off-3", kind: "flashcards", refId: "deck-1", title: "ফ্ল্যাশকার্ড: গতি ও বল", sizeMb: 0.2, version: "5", latestVersion: "5", status: "downloaded", progress: 100, downloadedAt: daysFromNow(-6), sync: "conflict", conflict: { localUpdatedAt: daysFromNow(-1), remoteUpdatedAt: daysFromNow(0, 7), summary: "এই ডিভাইসে ৪টি কার্ডের রেটিং বদলেছে, অন্য ডিভাইসে ২টি কার্ড সম্পাদিত হয়েছে।" } },
    { id: "off-4", kind: "quiz", refId: "ex-model-phy-1", title: "পদার্থবিজ্ঞান মডেল টেস্ট ১", sizeMb: 1.2, version: "1", latestVersion: "1", status: "downloaded", progress: 100, downloadedAt: daysFromNow(-2), sync: "synced" },
    { id: "off-5", kind: "audio", refId: "aud-phy-c2", title: "অডিও: গতি অধ্যায়", sizeMb: 14, version: "1", latestVersion: "1", status: "failed", progress: 37, sync: "synced" },
  ];
}

const repos = new Map<string, ReturnType<typeof createMockRepository<OfflineItem>>>();
export function offlineRepo(studentId: string) {
  let r = repos.get(studentId);
  if (!r) {
    r = createMockRepository<OfflineItem>({ collection: `offline:${studentId}`, seed: () => seed(studentId), timestamps: false, latency: 80 });
    repos.set(studentId, r);
  }
  return r;
}

export const offlineService = {
  list: (studentId: string) => offlineRepo(studentId).all(),
  async usage(studentId: string) {
    const items = await offlineRepo(studentId).raw();
    const usedMb = items.filter((i) => i.status === "downloaded" || i.status === "outdated").reduce((s, i) => s + i.sizeMb, 0);
    const { limits } = await usageService.get(studentId);
    return { usedMb: Math.round(usedMb * 10) / 10, limitMb: STORAGE_LIMIT_MB, count: items.filter((i) => i.status !== "failed").length, maxItems: limits.offlineDownloads };
  },
  async find(studentId: string, kind: OfflineItem["kind"], refId: string) {
    return (await offlineRepo(studentId).raw()).find((i) => i.kind === kind && i.refId === refId);
  },

  /** Simulated download: validates quota + storage, then "downloads" with network latency. */
  async download(studentId: string, input: Pick<OfflineItem, "kind" | "refId" | "title" | "sizeMb"> & { version?: string }) {
    const repo = offlineRepo(studentId);
    if (isEffectivelyOffline()) invalid("OFFLINE_DOWNLOAD");
    const items = await repo.raw();
    const existing = items.find((i) => i.kind === input.kind && i.refId === input.refId);
    const usage = await offlineService.usage(studentId);
    if (!existing && usage.count >= usage.maxItems) invalid("QUOTA_EXCEEDED");
    if (usage.usedMb + input.sizeMb > STORAGE_LIMIT_MB) invalid("STORAGE_FULL");
    const version = input.version ?? "1";
    const item = existing
      ? await repo.update(existing.id, { status: "downloading", progress: 10, latestVersion: version })
      : await repo.create({ id: newId("off"), ...input, version, latestVersion: version, status: "downloading", progress: 10, sync: "synced" });
    await mockRequest(600 + Math.min(1800, input.sizeMb * 25), { requiresNetwork: true });
    return repo.update(item.id, { status: "downloaded", progress: 100, version: item.latestVersion, downloadedAt: nowIso() });
  },
  async remove(studentId: string, id: string) {
    await offlineRepo(studentId).remove(id);
  },
  async removeByRef(studentId: string, kind: OfflineItem["kind"], refId: string) {
    const item = await offlineService.find(studentId, kind, refId);
    if (item) await offlineRepo(studentId).remove(item.id);
  },
  async update(studentId: string, id: string) {
    const repo = offlineRepo(studentId);
    const item = await repo.get(id);
    return offlineService.download(studentId, { kind: item.kind, refId: item.refId, title: item.title, sizeMb: item.sizeMb, version: item.latestVersion });
  },
  async retry(studentId: string, id: string) {
    return offlineService.update(studentId, id);
  },
  /** Pushes pending local changes; conflicts must be resolved explicitly. */
  async syncAll(studentId: string) {
    await mockRequest(900, { requiresNetwork: true });
    const repo = offlineRepo(studentId);
    const items = await repo.raw();
    const pending = items.filter((i) => i.sync === "pending");
    await repo.bulkUpdate(pending.map((i) => i.id), { sync: "synced" });
    return { synced: pending.length, conflicts: items.filter((i) => i.sync === "conflict").length };
  },
  async resolveConflict(studentId: string, id: string, keep: "local" | "remote" | "both") {
    await mockRequest(400, { requiresNetwork: true });
    const repo = offlineRepo(studentId);
    const item = await repo.get(id);
    // "remote" also bumps to the server version; "both" keeps a duplicate local copy in the real app.
    return repo.update(id, { sync: "synced", conflict: undefined, version: keep === "remote" ? item.latestVersion : item.version });
  },
  async clearAll(studentId: string) {
    await offlineRepo(studentId).replaceAll([]);
  },
};
