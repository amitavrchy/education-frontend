"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpCircle, AudioLines, BookOpen, CheckCircle2, ClipboardList, CloudOff, Download, GalleryVerticalEnd, HardDrive, Layers, Loader2, NotebookPen, RefreshCw, RotateCcw, Trash2, Wifi, WifiOff, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { OfflineItem } from "@/contracts";
import { useOfflineActions, useOfflineItems, useOfflineUsage } from "@/hooks/use-offline";
import { useOnline } from "@/hooks/use-online";
import { useStudentId, useStudentProfile } from "@/hooks/use-student";
import { useFormat, useL } from "@/i18n";
import { cn } from "@/lib/utils";
import { flashcardService } from "@/services/flashcards.service";
import { libraryService } from "@/services/library.service";
import { notesService } from "@/services/notes.service";
import { usePreferencesStore } from "@/stores/preferences-store";

const KIND: Record<OfflineItem["kind"], { icon: typeof BookOpen; bn: string; en: string; href: (refId: string) => string }> = {
  book: { icon: BookOpen, bn: "পাঠ্যবই", en: "Textbooks", href: (id) => `/student/library/${id}` },
  notes: { icon: NotebookPen, bn: "নোট", en: "Notes", href: (id) => `/student/notes/${id}` },
  flashcards: { icon: GalleryVerticalEnd, bn: "ফ্ল্যাশকার্ড", en: "Flashcards", href: (id) => `/student/flashcards?deck=${id}` },
  quiz: { icon: ClipboardList, bn: "কুইজ", en: "Quizzes", href: () => "/student/exams" },
  audio: { icon: AudioLines, bn: "অডিও", en: "Audio", href: (id) => `/student/audio?lesson=${id}` },
  chapter: { icon: Layers, bn: "অধ্যায়", en: "Chapters", href: () => "/student/curriculum" },
};

export function OfflinePage() {
  const l = useL();
  const f = useFormat();
  const studentId = useStudentId();
  const online = useOnline();
  const items = useOfflineItems();
  const usage = useOfflineUsage();
  const actions = useOfflineActions();
  const profile = useStudentProfile();
  const simulateOffline = usePreferencesStore((s) => s.simulateOffline);
  const setPref = usePreferencesStore((s) => s.set);
  const [conflict, setConflict] = useState<OfflineItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const suggestions = useQuery({
    queryKey: ["offline", studentId, "suggestions", profile.data?.subjectIds],
    enabled: !!profile.data,
    queryFn: async () => {
      const [books, decks, notes] = await Promise.all([libraryService.list(), flashcardService.decks(studentId), notesService.list(studentId)]);
      return [
        ...books.filter((b) => b.offlineEligible && b.isLatestEdition && profile.data!.subjectIds.includes(b.subjectId)).slice(0, 4).map((b) => ({ kind: "book" as const, refId: b.id, title: f.pick(b.title), sizeMb: Math.round(b.pageCount * 0.6), version: b.edition })),
        ...decks.map((d) => ({ kind: "flashcards" as const, refId: d.id, title: d.name, sizeMb: 0.2, version: "1" })),
        ...notes.slice(0, 4).map((n) => ({ kind: "notes" as const, refId: n.id, title: n.title, sizeMb: 0.3, version: String(n.versions.length + 1) })),
      ];
    },
  });

  const list = items.data ?? [];
  const has = new Set(list.filter((i) => i.status !== "failed").map((i) => `${i.kind}:${i.refId}`));
  const pending = list.filter((i) => i.sync === "pending").length;
  const conflicts = list.filter((i) => i.sync === "conflict");
  const groups = (Object.keys(KIND) as OfflineItem["kind"][]).map((k) => ({ kind: k, items: list.filter((i) => i.kind === k) })).filter((g) => g.items.length);

  if (items.isError) return <ErrorState error={items.error} onRetry={() => void items.refetch()} />;

  return (
    <>
      <PageHeader
        title={l("অফলাইন লার্নিং", "Offline learning")}
        description={l("ইন্টারনেট ছাড়াও পড়ার জন্য বই, নোট, ফ্ল্যাশকার্ড ও কুইজ ডাউনলোড করো (ডেমো সিমুলেশন)", "Download books, notes, flashcards and quizzes to study without internet (demo simulation)")}
        actions={
          <Button variant="outline" disabled={!online || actions.sync.isPending || (!pending && !conflicts.length)} onClick={() => actions.sync.mutate()}>
            {actions.sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {l("এখনই সিঙ্ক", "Sync now")}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className={cn("gap-3", online ? "border-success/40" : "border-warning/60")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {online ? <Wifi className="size-4 text-success" /> : <WifiOff className="size-4 text-warning" />}
              {online ? l("অনলাইন", "Online") : l("অফলাইন", "Offline")}
            </CardTitle>
            <CardDescription>{online ? l("সব ফিচার ব্যবহার করা যাবে।", "All features are available.") : l("ডাউনলোড করা বিষয়বস্তু খোলা যাবে; AI টিউটর ও সিঙ্ক বন্ধ।", "Downloaded content works; AI tutor and sync are paused.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-center justify-between gap-2 text-sm">
              {l("অফলাইন মোড সিমুলেট করো (ডেভেলপার)", "Simulate offline (developer)")}
              <Switch checked={simulateOffline} onCheckedChange={(v) => setPref("simulateOffline", v)} />
            </label>
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="size-4" /> {l("স্টোরেজ", "Storage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!usage.data ? (
              <Skeleton className="h-10" />
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span>{l(`${f.number(usage.data.usedMb)} MB ব্যবহৃত`, `${usage.data.usedMb} MB used`)}</span>
                  <span className="text-muted-foreground">{f.digits(usage.data.limitMb)} MB</span>
                </div>
                <Progress value={(usage.data.usedMb / usage.data.limitMb) * 100} aria-label={l("স্টোরেজ ব্যবহার", "Storage used")} />
                <p className="text-xs text-muted-foreground">{l(`${f.digits(usage.data.count)}/${f.digits(usage.data.maxItems)}টি ডাউনলোড (প্ল্যান সীমা)`, `${usage.data.count}/${usage.data.maxItems} downloads (plan limit)`)}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4" /> {l("সিঙ্ক অবস্থা", "Sync status")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" /> {l(`${f.digits(list.filter((i) => i.sync === "synced").length)}টি সিঙ্কড`, `${list.filter((i) => i.sync === "synced").length} synced`)}
            </p>
            <p className="flex items-center gap-2">
              <CloudOff className="size-4 text-info" /> {l(`${f.digits(pending)}টি অপেক্ষমাণ পরিবর্তন`, `${pending} pending changes`)}
            </p>
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" /> {l(`${f.digits(conflicts.length)}টি দ্বন্দ্ব`, `${conflicts.length} conflicts`)}
            </p>
          </CardContent>
        </Card>
      </div>

      {conflicts.map((c) => (
        <Alert key={c.id} className="mb-3 border-warning/60 bg-warning/10">
          <AlertTriangle className="text-warning" />
          <AlertTitle>{l(`সিঙ্ক দ্বন্দ্ব: ${c.title}`, `Sync conflict: ${c.title}`)}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{c.conflict?.summary}</span>
            <Button size="sm" variant="outline" onClick={() => setConflict(c)}>
              {l("সমাধান করো", "Resolve")}
            </Button>
          </AlertDescription>
        </Alert>
      ))}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {items.isPending ? (
            <Skeleton className="h-64" />
          ) : !groups.length ? (
            <EmptyState icon={Download} title={l("কোনো ডাউনলোড নেই", "No downloads yet")} description={l("ডান পাশের তালিকা থেকে কিছু ডাউনলোড করো।", "Download something from the list on the right.")} />
          ) : (
            groups.map((g) => {
              const K = KIND[g.kind];
              return (
                <Card key={g.kind} className="gap-2 p-0">
                  <h2 className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                    <K.icon className="size-4" /> {l(K.bn, K.en)} <Badge variant="secondary">{f.digits(g.items.length)}</Badge>
                  </h2>
                  <ul className="divide-y">
                    {g.items.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <Link href={K.href(i.refId)} className="block truncate font-medium hover:underline">
                            {i.title}
                          </Link>
                          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>{f.number(i.sizeMb)} MB</span>
                            <span>· v{i.version}</span>
                            {i.downloadedAt && <span>· {f.relative(i.downloadedAt)}</span>}
                            {i.sync === "pending" && <Badge variant="outline" className="text-[10px]">{l("সিঙ্ক বাকি", "Sync pending")}</Badge>}
                          </p>
                          {i.status === "downloading" && <Progress value={i.progress} className="mt-1 h-1.5" aria-label={l("ডাউনলোড অগ্রগতি", "Download progress")} />}
                        </div>
                        <StatusBadge item={i} />
                        {i.status === "outdated" && (
                          <Button size="sm" variant="outline" disabled={!online || actions.update.isPending} onClick={() => actions.update.mutate(i.id)}>
                            <ArrowUpCircle /> {l(`v${i.latestVersion}-এ হালনাগাদ`, `Update to v${i.latestVersion}`)}
                          </Button>
                        )}
                        {i.status === "failed" && (
                          <Button size="sm" variant="outline" disabled={!online || actions.update.isPending} onClick={() => actions.update.mutate(i.id)}>
                            <RotateCcw /> {l("আবার চেষ্টা", "Retry")}
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label={l(`${i.title} মুছো`, `Remove ${i.title}`)} onClick={() => actions.remove.mutate(i.id)}>
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })
          )}
          {!!list.length && (
            <Button variant="ghost" className="text-destructive" onClick={() => setConfirmClear(true)}>
              <Trash2 /> {l("সব অফলাইন ডেটা মুছো", "Clear all offline data")}
            </Button>
          )}
        </div>
        <Card className="h-fit gap-2">
          <CardHeader>
            <CardTitle className="text-base">{l("অফলাইনের জন্য প্রস্তাবিত", "Suggested for offline")}</CardTitle>
            <CardDescription>{l("তোমার বিষয় ও সাম্প্রতিক কাজের ভিত্তিতে", "Based on your subjects and recent work")}</CardDescription>
          </CardHeader>
          <CardContent>
            {suggestions.isPending ? (
              <Skeleton className="h-40" />
            ) : (
              <ul className="space-y-2">
                {(suggestions.data ?? [])
                  .filter((s) => !has.has(`${s.kind}:${s.refId}`))
                  .slice(0, 8)
                  .map((s) => {
                    const K = KIND[s.kind];
                    return (
                      <li key={`${s.kind}:${s.refId}`} className="flex items-center gap-2 text-sm">
                        <K.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                        <Button size="sm" variant="outline" className="h-7" disabled={!online || actions.download.isPending} onClick={() => actions.download.mutate(s)}>
                          {actions.download.isPending && actions.download.variables?.refId === s.refId ? <Loader2 className="animate-spin" /> : <Download />}
                          {f.number(s.sizeMb)}MB
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            )}
            {!online && <p className="mt-3 text-xs text-warning-foreground dark:text-warning">{l("ডাউনলোডের জন্য ইন্টারনেট লাগবে।", "Downloads need an internet connection.")}</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!conflict} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{l("সিঙ্ক দ্বন্দ্ব সমাধান", "Resolve sync conflict")}</DialogTitle>
            <DialogDescription>{conflict?.title}</DialogDescription>
          </DialogHeader>
          {conflict?.conflict && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{l("এই ডিভাইস", "This device")}</p>
                <p className="text-xs text-muted-foreground">{f.date(conflict.conflict.localUpdatedAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{l("অন্য ডিভাইস / সার্ভার", "Other device / server")}</p>
                <p className="text-xs text-muted-foreground">{f.date(conflict.conflict.remoteUpdatedAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <p className="text-sm sm:col-span-2">{conflict.conflict.summary}</p>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {(
              [
                ["local", l("এই ডিভাইসেরটা রাখো", "Keep this device")],
                ["remote", l("সার্ভারেরটা রাখো", "Keep server version")],
                ["both", l("দুটোই রাখো (কপি)", "Keep both (copy)")],
              ] as const
            ).map(([keep, label]) => (
              <Button key={keep} variant={keep === "both" ? "default" : "outline"} disabled={!online || actions.resolve.isPending} onClick={() => actions.resolve.mutate({ id: conflict!.id, keep }, { onSuccess: () => setConflict(null) })}>
                {label}
              </Button>
            ))}
          </DialogFooter>
          {!online && <p className="text-xs text-muted-foreground">{l("সমাধানের জন্য অনলাইনে থাকতে হবে।", "You need to be online to resolve.")}</p>}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{l("সব অফলাইন ডেটা মুছবে?", "Clear all offline data?")}</DialogTitle>
            <DialogDescription>{l("অসিঙ্কড পরিবর্তন থাকলে সেগুলো হারিয়ে যাবে।", "Unsynced changes will be lost.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              {l("বাতিল", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={() => actions.clearAll.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}>
              {l("মুছে ফেলো", "Clear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ item }: { item: OfflineItem }) {
  const l = useL();
  const map = {
    queued: [l("সারিতে", "Queued"), "bg-muted text-muted-foreground", Loader2],
    downloading: [l("ডাউনলোড হচ্ছে", "Downloading"), "bg-info/15 text-info", Loader2],
    downloaded: [l("অফলাইনে আছে", "Available offline"), "bg-success/15 text-success", CheckCircle2],
    failed: [l("ব্যর্থ", "Failed"), "bg-destructive/10 text-destructive", XCircle],
    outdated: [l("নতুন সংস্করণ আছে", "Update available"), "bg-warning/20 text-warning-foreground dark:text-warning", ArrowUpCircle],
  } as const;
  const [label, cls, Icon] = map[item.status];
  return (
    <Badge className={cn("gap-1", cls)}>
      <Icon className={cn("size-3", item.status === "downloading" && "animate-spin")} /> {label}
    </Badge>
  );
}
