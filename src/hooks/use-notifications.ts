"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api";
import { notificationService } from "@/services";

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: notificationService.list,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
