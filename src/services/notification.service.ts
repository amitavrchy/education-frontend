import { env } from "@/config/env";
import { apiClient, endpoints } from "@/lib/api";
import type { ApiResponse, Notification } from "@/types";
import { notificationMockService } from "./mock/notification.mock";

const notificationApiService = {
  async list() {
    const res = await apiClient.get<ApiResponse<Notification[]>>(endpoints.notifications.list);
    return res.data;
  },
  async markRead(id: string) {
    await apiClient.patch<void>(endpoints.notifications.markRead(id));
  },
};

export const notificationService = env.NEXT_PUBLIC_USE_MOCK_API
  ? notificationMockService
  : notificationApiService;
