"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Award, Bell, BellRing, BookOpen, CalendarClock, CheckCheck, ClipboardCheck, CreditCard, ExternalLink, FileWarning, GraduationCap, Info, Megaphone, MessageSquare, RotateCcw, Settings2, Trash2, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOTIFICATION_TYPES, type AppNotification, type NotificationType } from "@/contracts";
import { notificationKeys, useNotificationActions, useNotifications } from "@/hooks/use-notifications";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services";
import type { PortalKey } from "@/types";

export const NOTIFICATION_META: Record<NotificationType, { icon: typeof Bell; bn: string; en: string; tone: string }> = {
  study_reminder: { icon: CalendarClock, bn: "পড়ার রিমাইন্ডার", en: "Study reminder", tone: "bg-primary/10 text-primary" },
  upcoming_exam: { icon: ClipboardCheck, bn: "আসন্ন পরীক্ষা", en: "Upcoming exam", tone: "bg-destructive/10 text-destructive" },
  revision_reminder: { icon: RotateCcw, bn: "রিভিশন রিমাইন্ডার", en: "Revision reminder", tone: "bg-info/15 text-info" },
  new_assignment: { icon: BookOpen, bn: "নতুন অ্যাসাইনমেন্ট", en: "New assignment", tone: "bg-chart-4/15 text-chart-4" },
  exam_result: { icon: Trophy, bn: "পরীক্ষার ফল", en: "Exam result", tone: "bg-success/15 text-success" },
  teacher_feedback: { icon: MessageSquare, bn: "শিক্ষকের মন্তব্য", en: "Teacher feedback", tone: "bg-chart-5/15 text-chart-5" },
  subscription: { icon: CreditCard, bn: "সাবস্ক্রিপশন", en: "Subscription", tone: "bg-muted text-foreground" },
  payment: { icon: Wallet, bn: "পেমেন্ট", en: "Payment", tone: "bg-muted text-foreground" },
  curriculum_update: { icon: GraduationCap, bn: "কারিকুলাম আপডেট", en: "Curriculum update", tone: "bg-info/15 text-info" },
  board_announcement: { icon: Megaphone, bn: "বোর্ড ঘোষণা", en: "Board announcement", tone: "bg-warning/20 text-warning-foreground dark:text-warning" },
  content_correction: { icon: FileWarning, bn: "কনটেন্ট সংশোধন", en: "Content correction", tone: "bg-warning/20 text-warning-foreground dark:text-warning" },
  system: { icon: Info, bn: "সিস্টেম", en: "System", tone: "bg-muted text-foreground" },
  achievement: { icon: Award, bn: "অর্জন", en: "Achievement", tone: "bg-success/15 text-success" },
};

const SIMULATIONS: Record<PortalKey, { type: NotificationType; title: string; body: string; href: string }[]> = {
  student: [
    { type: "study_reminder", title: "পড়ার সময় হয়েছে ⏰", body: "আজকের পরিকল্পনা: রসায়ন — মোল ধারণা (৪৫ মিনিট)।", href: "/student/study-planner" },
    { type: "revision_reminder", title: "ফ্ল্যাশকার্ড রিভিশন বাকি", body: "আজ ২০টি কার্ড রিভিউ করার সময় হয়েছে।", href: "/student/flashcards" },
    { type: "exam_result", title: "শ্রেণি পরীক্ষার ফল প্রকাশিত", body: "বল ও গতি পরীক্ষায় তুমি ২৪/৩০ পেয়েছ।", href: "/student/results" },
  ],
  parent: [{ type: "exam_result", title: "রাফির নতুন পরীক্ষার ফল", body: "পদার্থবিজ্ঞান মডেল টেস্টে ৮৪%।", href: "/parent/results" }],
  teacher: [{ type: "new_assignment", title: "নতুন জমা: ৫টি উত্তরপত্র", body: "১০ম শ্রেণি (ক) — বল অধ্যায়ের অ্যাসাইনমেন্ট।", href: "/teacher/submissions" }],
  admin: [{ type: "content_correction", title: "নতুন কনটেন্ট রিপোর্ট", body: "একটি প্রশ্নের উত্তর ভুল বলে রিপোর্ট হয়েছে।", href: "/admin/moderation" }],
};

function usePushPermission() {
  return useSyncExternalStore(
    () => () => undefined,
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "default",
  );
}

export function NotificationCenter({ portal }: { portal: PortalKey }) {
  const l = useL();
  const f = useFormat();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useNotifications(portal, true);
  const actions = useNotificationActions(portal);
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");
  const [type, setType] = useState<NotificationType | "all">("all");
  const [open, setOpen] = useState<AppNotification | null>(null);
  const permission = usePushPermission();
  const [, force] = useState(0);

  const simulate = useMutation({
    mutationFn: async () => {
      const list = SIMULATIONS[portal];
      const pick = list[Math.floor(Math.random() * list.length)];
      return notificationService.push({ portal, type: pick.type, title: pick.title, body: pick.body, href: pick.href, priority: "normal" });
    },
    onSuccess: (n) => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
      toast(n.title, { description: n.body, icon: <BellRing className="size-4" />, action: n.href ? { label: l("খোলো", "Open"), onClick: () => router.push(n.href!) } : undefined });
      if (permission === "granted" && document.hidden) new Notification(n.title, { body: n.body });
    },
  });

  const all = q.data ?? [];
  const list = all
    .filter((n) => (tab === "archived" ? n.archived : !n.archived))
    .filter((n) => tab !== "unread" || !n.read)
    .filter((n) => type === "all" || n.type === type)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = all.filter((n) => !n.read && !n.archived).length;

  const openItem = (n: AppNotification) => {
    setOpen(n);
    if (!n.read) actions.markRead.mutate({ id: n.id, read: true });
  };

  return (
    <>
      <PageHeader
        title={l("নোটিফিকেশন", "Notifications")}
        description={l(`${f.digits(unread)}টি অপঠিত`, `${unread} unread`)}
        actions={
          <>
            <Button variant="outline" onClick={() => simulate.mutate()} disabled={simulate.isPending}>
              <BellRing /> {l("নমুনা নোটিফিকেশন", "Simulate notification")}
            </Button>
            <Button variant="outline" disabled={!unread || actions.markAllRead.isPending} onClick={() => actions.markAllRead.mutate(undefined, { onSuccess: () => toast.success(l("সব পঠিত হিসেবে চিহ্নিত", "All marked as read")) })}>
              <CheckCheck /> {l("সব পঠিত", "Mark all read")}
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label={l("নোটিফিকেশন সেটিংস", "Notification settings")}>
              <Link href={`/${portal}/settings?tab=notifications`}>
                <Settings2 />
              </Link>
            </Button>
          </>
        }
      />
      {permission === "default" && (
        <Card className="mb-4 flex-row items-center gap-3 border-info/40 bg-info/5 p-4">
          <BellRing className="size-5 shrink-0 text-info" />
          <p className="flex-1 text-sm">{l("ব্রাউজার পুশ নোটিফিকেশন চালু করলে অ্যাপ বন্ধ থাকলেও রিমাইন্ডার পাবে (ডেমোতে শুধু এই ডিভাইসে)।", "Enable browser push to get reminders even when the app is in the background (demo: this device only).")}</p>
          <Button size="sm" onClick={() => void Notification.requestPermission().then(() => force((x) => x + 1))}>
            {l("চালু করো", "Enable")}
          </Button>
        </Card>
      )}
      {permission === "denied" && <p className="mb-4 text-sm text-muted-foreground">{l("ব্রাউজারে পুশ নোটিফিকেশন বন্ধ করা আছে। ব্রাউজারের সাইট সেটিংস থেকে চালু করা যাবে।", "Push notifications are blocked in this browser. Enable them in site settings.")}</p>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">{l("ইনবক্স", "Inbox")}</TabsTrigger>
            <TabsTrigger value="unread">
              {l("অপঠিত", "Unread")} {!!unread && <Badge className="ml-1 h-4 px-1 text-[10px]">{f.digits(unread)}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="archived">{l("আর্কাইভ", "Archived")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={type} onValueChange={(v) => setType(v as NotificationType | "all")}>
          <SelectTrigger className="sm:w-56" aria-label={l("ধরন", "Type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l("সব ধরন", "All types")}</SelectItem>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {l(NOTIFICATION_META[t].bn, NOTIFICATION_META[t].en)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState icon={Bell} title={tab === "archived" ? l("আর্কাইভ খালি", "Archive is empty") : l("কোনো নোটিফিকেশন নেই", "No notifications")} description={l("নতুন কিছু এলে এখানে দেখা যাবে।", "New notifications will appear here.")} />
      ) : (
        <Card className="gap-0 divide-y p-0">
          {list.map((n) => {
            const meta = NOTIFICATION_META[n.type];
            return (
              <div key={n.id} className={cn("group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40", !n.read && "bg-primary/[0.03]")}>
                <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", meta.tone)}>
                  <meta.icon className="size-4" />
                </span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openItem(n)}>
                  <span className="flex items-center gap-2">
                    {!n.read && <span role="img" className="size-2 shrink-0 rounded-full bg-primary" aria-label={l("অপঠিত", "Unread")} />}
                    <span className={cn("truncate", !n.read && "font-semibold")}>{n.title}</span>
                    {n.priority === "high" && <Badge variant="destructive" className="text-[10px]">{l("জরুরি", "Urgent")}</Badge>}
                  </span>
                  <span className="line-clamp-1 text-sm text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground">
                    {l(meta.bn, meta.en)} · {f.relative(n.createdAt)}
                  </span>
                </button>
                <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <Button size="icon" variant="ghost" className="size-8" aria-label={n.read ? l("অপঠিত করো", "Mark unread") : l("পঠিত করো", "Mark read")} onClick={() => actions.markRead.mutate({ id: n.id, read: !n.read })}>
                    <CheckCheck className={cn(n.read && "text-muted-foreground")} />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8" aria-label={n.archived ? l("আর্কাইভ থেকে ফেরাও", "Unarchive") : l("আর্কাইভ", "Archive")} onClick={() => actions.archive.mutate({ id: n.id, archived: !n.archived })}>
                    {n.archived ? <ArchiveRestore /> : <Archive />}
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label={l("মুছো", "Delete")} onClick={() => actions.remove.mutate(n.id, { onSuccess: () => toast.success(l("মুছে ফেলা হয়েছে", "Deleted")) })}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <>
              <DialogHeader>
                <Badge variant="outline" className="w-fit">
                  {l(NOTIFICATION_META[open.type].bn, NOTIFICATION_META[open.type].en)}
                </Badge>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>{f.date(open.createdAt, { dateStyle: "full", timeStyle: "short" })}</DialogDescription>
              </DialogHeader>
              <p className="text-sm">{open.body}</p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    actions.archive.mutate({ id: open.id, archived: !open.archived });
                    setOpen(null);
                  }}
                >
                  <Archive /> {open.archived ? l("আর্কাইভ থেকে ফেরাও", "Unarchive") : l("আর্কাইভ", "Archive")}
                </Button>
                {open.href && (
                  <Button asChild>
                    <Link href={open.href}>
                      <ExternalLink /> {l("সংশ্লিষ্ট পাতায় যাও", "Go to page")}
                    </Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
