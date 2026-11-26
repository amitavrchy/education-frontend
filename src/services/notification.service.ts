import type { AppNotification, Notice } from "@/contracts";
import { noticeSeed, notificationSeed } from "@/mock-data/notifications";
import type { PortalKey } from "@/types";
import { createMockRepository, selectRepository } from "./core/repository";
import { mockRequest, newId, nowIso } from "./core/mock-runtime";
import { isRemote, remote } from "./core/remote";

const mockNotifications = createMockRepository<AppNotification>({
  collection: "notifications",
  seed: () => notificationSeed,
  searchFields: ["title", "body"],
  idPrefix: "ntf",
  timestamps: false,
  defaultSort: { sortBy: "createdAt", sortOrder: "desc" },
  latency: 120,
});

export const notificationsRepo = selectRepository(mockNotifications, "/notifications");

export const noticesRepo = createMockRepository<Notice>({
  collection: "notices",
  seed: () => noticeSeed,
  searchFields: ["title.bn", "title.en"],
  timestamps: false,
  defaultSort: { sortBy: "publishedAt", sortOrder: "desc" },
});

export const notificationService = {
  async list(portal: PortalKey, opts: { includeArchived?: boolean } = {}) {
    const items = await notificationsRepo.all({ portal });
    return items.filter((n) => (opts.includeArchived ? true : !n.archived));
  },
  markRead: (id: string, read = true) => notificationsRepo.update(id, { read }),
  archive: (id: string, archived = true) => notificationsRepo.update(id, { archived }),
  remove: (id: string) => notificationsRepo.remove(id),
  async markAllRead(portal: PortalKey) {
    if (isRemote()) {
      await remote.post("/notifications/read-all", { portal });
      return;
    }
    const ids = (await mockNotifications.raw()).filter((n) => n.portal === portal && !n.read).map((n) => n.id);
    await notificationsRepo.bulkUpdate(ids, { read: true });
  },
  /** Used by features that "send" notifications locally (reminders, results, admin broadcasts). */
  async push(input: Omit<AppNotification, "id" | "read" | "archived" | "createdAt">) {
    await mockRequest(50);
    return notificationsRepo.create({ ...input, read: false, archived: false, createdAt: nowIso(), id: newId("ntf") });
  },
};
