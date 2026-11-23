"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services";
import type { PortalKey } from "@/types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (portal: PortalKey, archived = false) => ["notifications", portal, archived] as const,
};

export function useNotifications(portal: PortalKey, includeArchived = false) {
  return useQuery({
    queryKey: notificationKeys.list(portal, includeArchived),
    queryFn: () => notificationService.list(portal, { includeArchived }),
    staleTime: 15_000,
  });
}

export function useNotificationActions(portal: PortalKey) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  return {
    markRead: useMutation({ mutationFn: ({ id, read }: { id: string; read: boolean }) => notificationService.markRead(id, read), onSuccess: invalidate }),
    archive: useMutation({ mutationFn: ({ id, archived }: { id: string; archived: boolean }) => notificationService.archive(id, archived), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => notificationService.remove(id), onSuccess: invalidate }),
    markAllRead: useMutation({ mutationFn: () => notificationService.markAllRead(portal), onSuccess: invalidate }),
  };
}
