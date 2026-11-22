import { sleep } from "@/lib/helpers";
import { mockNotifications } from "@/mock-data";
import type { Notification } from "@/types";

export const notificationMockService = {
  async list(): Promise<Notification[]> {
    await sleep(300);
    return mockNotifications;
  },
  async markRead(id: string): Promise<void> {
    await sleep(100);
    const item = mockNotifications.find((notification) => notification.id === id);
    if (item) item.read = true;
  },
};
