"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationActions, useNotifications } from "@/hooks/use-notifications";
import { useFormat, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";

export function NotificationBell() {
  const portal = usePortal();
  const { data = [], isPending, isError, refetch } = useNotifications(portal.key);
  const { markRead, markAllRead } = useNotificationActions(portal.key);
  const router = useRouter();
  const t = useT();
  const f = useFormat();
  const unread = data.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${t("shell.notifications")}${unread ? ` (${unread})` : ""}`}>
          <Bell />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {f.digits(unread)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">{t("shell.notifications")}</p>
          {unread > 0 && (
            <Button variant="link" size="xs" onClick={() => markAllRead.mutate()}>
              {t("shell.markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {isPending ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm">
              <p className="text-muted-foreground">{t("states.networkError")}</p>
              <Button variant="link" size="sm" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("shell.noNotifications")}</p>
          ) : (
            <ul className="divide-y">
              {data.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) markRead.mutate({ id: n.id, read: true });
                      if (n.href) router.push(n.href);
                    }}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted", !n.read && "bg-accent/40")}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : n.priority === "high" ? "bg-destructive" : "bg-primary")} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">{n.body}</span>
                      <span className="text-caption">{f.relative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href={`${portal.basePath}/notifications`}>{t("common.viewAll")}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
