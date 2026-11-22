"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { formatDate, toBanglaDigits } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export function NotificationPanel() {
  const { data: notifications = [], isPending } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="নোটিফিকেশন">
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {toBanglaDigits(unread)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">নোটিফিকেশন</p>
          {unread > 0 && <span className="text-caption">{toBanglaDigits(unread)}টি নতুন</span>}
        </div>
        <ScrollArea className="max-h-80">
          {isPending ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">কোনো নোটিফিকেশন নেই</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => !notification.read && markRead.mutate(notification.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted",
                      !notification.read && "bg-accent/50",
                    )}
                  >
                    <span className="text-sm font-medium">{notification.title}</span>
                    <span className="text-sm text-muted-foreground">{notification.body}</span>
                    <span className="text-caption">
                      {formatDate(notification.createdAt, { dateStyle: "medium", timeZone: "Asia/Dhaka" })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
